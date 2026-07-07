// 配置读写核心逻辑。
//
// 涉及三个 opencode 配置文件（均位于 ~/.config/opencode/）：
//   - opencode.json        主配置，含 `plugin` 数组与 `provider`（模型来源）
//   - tui.json             TUI 配置，同样含 `plugin` 数组，需与主配置同步
//   - oh-my-openagent.json 插件专属配置，含 agents / categories 的 model 字段
// 以及一个本工具自己的状态文件：
//   - .opm.json            记录被“禁用”的插件（保留完整名，便于恢复）

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::path::{Path, PathBuf};

use crate::error::CmdResult;

const OPENCODE_JSON: &str = "opencode.json";
const TUI_JSON: &str = "tui.json";
const OMA_JSON: &str = "oh-my-openagent.json";
const STATE_JSON: &str = ".opm.json";
const LEGACY_STATE_JSON: &str = ".omo-switch.json";

// ---------- 对外数据结构 ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginItem {
    pub name: String,
    pub base_name: String,
    pub version: String,
    pub enabled: bool,
    pub configurable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentEntry {
    pub key: String,
    pub model: String,
    pub fallback_models: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OmaConfig {
    pub present: bool,
    pub agents: Vec<AgentEntry>,
    pub categories: Vec<AgentEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppState {
    pub config_dir: String,
    pub plugins: Vec<PluginItem>,
    /// provider/model 形式的全部可用模型（来自 opencode.json 的 provider 段）。
    pub available_models: Vec<String>,
    pub oma: OmaConfig,
}

// ---------- 禁用状态文件结构 ----------

#[derive(Debug, Serialize, Deserialize, Default)]
struct SwitchState {
    #[serde(default)]
    disabled_plugins: Vec<String>,
}

// ---------- 路径解析 ----------

pub fn config_dir() -> Result<PathBuf, String> {
    // opencode 全局配置固定位于 ~/.config/opencode。
    let home = dirs_home()?;
    Ok(home.join(".config").join("opencode"))
}

fn dirs_home() -> Result<PathBuf, String> {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "无法解析 HOME 目录".to_string())
}

pub fn open_config_file(file_name: &str) -> CmdResult<()> {
    // 仅允许打开配置目录内的已知文件，防止路径穿越。
    let allowed = [OPENCODE_JSON, TUI_JSON, OMA_JSON];
    if !allowed.contains(&file_name) {
        return Err(format!("不允许打开的文件: {}", file_name).into());
    }
    let path = config_dir()?.join(file_name);
    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()).into());
    }
    open::that(&path).map_err(|e| format!("打开文件失败: {}", e))?;
    Ok(())
}

// ---------- 通用 JSON 读写 ----------

/// 读取 JSON 文件为 Value；文件不存在时返回 None。
fn read_json_opt(path: &Path) -> CmdResult<Option<Value>> {
    if !path.exists() {
        return Ok(None);
    }
    let text = std::fs::read_to_string(path)?;
    if text.trim().is_empty() {
        return Ok(None);
    }
    let value: Value = serde_json::from_str(&text)?;
    Ok(Some(value))
}

/// 将 Value 以 2 空格缩进写回文件，末尾补换行。
fn write_json(path: &Path, value: &Value) -> CmdResult<()> {
    let mut text = serde_json::to_string_pretty(value)?;
    text.push('\n');
    std::fs::write(path, text)?;
    Ok(())
}

// ---------- 状态文件（禁用记录）----------

fn read_switch_state(dir: &Path) -> CmdResult<SwitchState> {
    migrate_legacy_switch_state(dir)?;

    match read_json_opt(&dir.join(STATE_JSON))? {
        Some(v) => Ok(serde_json::from_value(v).unwrap_or_default()),
        None => Ok(SwitchState::default()),
    }
}

fn migrate_legacy_switch_state(dir: &Path) -> CmdResult<()> {
    let legacy_path = dir.join(LEGACY_STATE_JSON);
    let state_path = dir.join(STATE_JSON);
    if legacy_path.exists() && !state_path.exists() {
        std::fs::rename(legacy_path, state_path)?;
    }
    Ok(())
}

fn write_switch_state(dir: &Path, state: &SwitchState) -> CmdResult<()> {
    let value = serde_json::to_value(state)?;
    write_json(&dir.join(STATE_JSON), &value)
}

// ---------- 插件数组读写 ----------

/// 从一个配置 Value 中取出 plugin 数组（字符串列表）。
fn extract_plugins(value: &Value) -> Vec<String> {
    value
        .get("plugin")
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default()
}

/// 将启用插件列表写回某个配置文件（若文件存在）。保持其余字段不变。
fn write_plugins_to(path: &Path, enabled: &[String]) -> CmdResult<()> {
    let Some(mut value) = read_json_opt(path)? else {
        return Ok(()); // 文件不存在则跳过（例如未使用 tui.json）
    };
    let obj = value
        .as_object_mut()
        .ok_or_else(|| format!("{} 顶层不是 JSON 对象", path.display()))?;
    let arr = enabled
        .iter()
        .map(|s| Value::String(s.clone()))
        .collect::<Vec<_>>();
    obj.insert("plugin".to_string(), Value::Array(arr));
    write_json(path, &value)
}

// ---------- provider 模型提取 ----------

/// 从 opencode.json 的 provider 段提取所有 `provider/model` 形式的模型标识。
fn extract_models(opencode: &Value) -> Vec<String> {
    let mut out = Vec::new();
    let Some(providers) = opencode.get("provider").and_then(Value::as_object) else {
        return out;
    };
    for (provider_name, provider_val) in providers {
        if let Some(models) = provider_val.get("models").and_then(Value::as_object) {
            for model_id in models.keys() {
                out.push(format!("{}/{}", provider_name, model_id));
            }
        }
    }
    out.sort();
    out
}

// ---------- oh-my-openagent 配置提取 ----------

fn extract_agent_entries(oma: &Value, section: &str) -> Vec<AgentEntry> {
    let mut out = Vec::new();
    let Some(map) = oma.get(section).and_then(Value::as_object) else {
        return out;
    };
    for (key, val) in map {
        let model = val
            .get("model")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned();
        let fallback_models = val
            .get("fallback_models")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m.get("model").and_then(Value::as_str).map(str::to_owned))
                    .collect()
            })
            .unwrap_or_default();
        out.push(AgentEntry {
            key: key.clone(),
            model,
            fallback_models,
        });
    }
    out
}

fn load_oma(dir: &Path) -> CmdResult<OmaConfig> {
    match read_json_opt(&dir.join(OMA_JSON))? {
        Some(v) => Ok(OmaConfig {
            present: true,
            agents: extract_agent_entries(&v, "agents"),
            categories: extract_agent_entries(&v, "categories"),
        }),
        None => Ok(OmaConfig {
            present: false,
            agents: Vec::new(),
            categories: Vec::new(),
        }),
    }
}

// ---------- 顶层：加载全部状态 ----------

pub fn load_state() -> CmdResult<AppState> {
    load_state_in(&config_dir()?)
}

fn load_state_in(dir: &Path) -> CmdResult<AppState> {
    let opencode = read_json_opt(&dir.join(OPENCODE_JSON))?
        .ok_or_else(|| format!("{} 不存在", dir.join(OPENCODE_JSON).display()))?;

    let enabled = extract_plugins(&opencode);
    let switch_state = read_switch_state(&dir)?;

    // 合并：启用（来自 opencode.json）+ 禁用（来自状态文件），去重。
    let mut plugins: Vec<PluginItem> = Vec::new();
    for name in &enabled {
        plugins.push(make_plugin_item(name, true));
    }
    for name in &switch_state.disabled_plugins {
        if !enabled.contains(name) {
            plugins.push(make_plugin_item(name, false));
        }
    }

    Ok(AppState {
        config_dir: dir.to_string_lossy().into_owned(),
        plugins,
        available_models: extract_models(&opencode),
        oma: load_oma(&dir)?,
    })
}

/// 判断插件是否有本工具支持修复的专属配置。
fn is_configurable(name: &str) -> bool {
    // oh-my-openagent@latest、oh-my-openagent 等变体都算。
    plugin_base_name(name).starts_with("oh-my-openagent")
}

fn plugin_base_name(name: &str) -> &str {
    match name.rfind('@') {
        Some(idx) if idx > 0 => &name[..idx],
        _ => name,
    }
}

fn plugin_version(name: &str) -> &str {
    match name.rfind('@') {
        Some(idx) if idx > 0 => &name[idx + 1..],
        _ => "",
    }
}

fn make_plugin_item(name: &str, enabled: bool) -> PluginItem {
    PluginItem {
        base_name: plugin_base_name(name).to_string(),
        version: plugin_version(name).to_string(),
        configurable: is_configurable(name),
        name: name.to_string(),
        enabled,
    }
}

// ---------- 顶层：切换插件启停 ----------

pub fn toggle_plugin(name: &str, enabled: bool) -> CmdResult<AppState> {
    toggle_plugin_in(&config_dir()?, name, enabled)
}

fn toggle_plugin_in(dir: &Path, name: &str, enabled: bool) -> CmdResult<AppState> {
    let opencode_path = dir.join(OPENCODE_JSON);

    let opencode = read_json_opt(&opencode_path)?
        .ok_or_else(|| format!("{} 不存在", opencode_path.display()))?;
    let mut current = extract_plugins(&opencode);
    let mut switch_state = read_switch_state(dir)?;

    if enabled {
        // 启用：加入数组（若不在），从禁用记录移除。
        if !current.iter().any(|p| p == name) {
            current.push(name.to_string());
        }
        switch_state.disabled_plugins.retain(|p| p != name);
    } else {
        // 禁用：从数组移除，加入禁用记录（去重）。
        current.retain(|p| p != name);
        if !switch_state.disabled_plugins.iter().any(|p| p == name) {
            switch_state.disabled_plugins.push(name.to_string());
        }
    }

    // 写回主配置 + TUI 配置（保持 plugin 同步），并更新禁用记录。
    write_plugins_to(&opencode_path, &current)?;
    write_plugins_to(&dir.join(TUI_JSON), &current)?;
    write_switch_state(dir, &switch_state)?;

    load_state_in(dir)
}

// ---------- 顶层：新增插件 ----------

pub fn add_plugin(name: &str) -> CmdResult<AppState> {
    add_plugin_in(&config_dir()?, name)
}

fn add_plugin_in(dir: &Path, name: &str) -> CmdResult<AppState> {
    let name = name.trim();
    if name.is_empty() {
        return Err("插件名不能为空".to_string().into());
    }
    let opencode_path = dir.join(OPENCODE_JSON);
    let opencode = read_json_opt(&opencode_path)?
        .ok_or_else(|| format!("{} 不存在", opencode_path.display()))?;
    let mut current = extract_plugins(&opencode);
    let mut switch_state = read_switch_state(dir)?;

    if current.iter().any(|p| p == name) {
        return Err(format!("插件 {} 已存在", name).into());
    }
    current.push(name.to_string());
    switch_state.disabled_plugins.retain(|p| p != name);

    write_plugins_to(&opencode_path, &current)?;
    write_plugins_to(&dir.join(TUI_JSON), &current)?;
    write_switch_state(dir, &switch_state)?;

    load_state_in(dir)
}

// ---------- 顶层：彻底移除插件 ----------

pub fn remove_plugin(name: &str) -> CmdResult<AppState> {
    remove_plugin_in(&config_dir()?, name)
}

fn remove_plugin_in(dir: &Path, name: &str) -> CmdResult<AppState> {
    let opencode_path = dir.join(OPENCODE_JSON);
    let opencode = read_json_opt(&opencode_path)?
        .ok_or_else(|| format!("{} 不存在", opencode_path.display()))?;
    let mut current = extract_plugins(&opencode);
    let mut switch_state = read_switch_state(dir)?;

    current.retain(|p| p != name);
    switch_state.disabled_plugins.retain(|p| p != name);

    write_plugins_to(&opencode_path, &current)?;
    write_plugins_to(&dir.join(TUI_JSON), &current)?;
    write_switch_state(dir, &switch_state)?;

    load_state_in(dir)
}

// ---------- 顶层：修改 agent/category 模型 ----------

pub fn update_agent_model(section: &str, key: &str, model: &str) -> CmdResult<AppState> {
    update_agent_model_in(&config_dir()?, section, key, model)
}

fn update_agent_model_in(
    dir: &Path,
    section: &str,
    key: &str,
    model: &str,
) -> CmdResult<AppState> {
    if section != "agents" && section != "categories" {
        return Err(format!("非法的 section: {}", section).into());
    }
    let oma_path = dir.join(OMA_JSON);
    let mut oma = read_json_opt(&oma_path)?
        .ok_or_else(|| format!("{} 不存在", oma_path.display()))?;

    let root = oma
        .as_object_mut()
        .ok_or_else(|| format!("{} 顶层不是 JSON 对象", oma_path.display()))?;

    let section_obj = root
        .entry(section.to_string())
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
        .ok_or_else(|| format!("{} 段不是对象", section))?;

    let entry = section_obj
        .entry(key.to_string())
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
        .ok_or_else(|| format!("{}.{} 不是对象", section, key))?;

    entry.insert("model".to_string(), Value::String(model.to_owned()));

    write_json(&oma_path, &oma)?;
    load_state_in(dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        // 创建最小化的测试配置
        let opencode = serde_json::json!({
            "plugin": ["oh-my-openagent@latest"],
            "provider": {
                "test-provider": {
                    "models": {
                        "model-a": { "name": "model-a" },
                        "model-b": { "name": "model-b" }
                    }
                }
            }
        });

        let tui = serde_json::json!({
            "plugin": ["oh-my-openagent@latest"]
        });

        let oma = serde_json::json!({
            "agents": {
                "test-agent": { "model": "test-provider/model-a" }
            },
            "categories": {
                "test-cat": { "model": "test-provider/model-b" }
            }
        });

        fs::write(dir.join("opencode.json"), serde_json::to_string_pretty(&opencode).unwrap()).unwrap();
        fs::write(dir.join("tui.json"), serde_json::to_string_pretty(&tui).unwrap()).unwrap();
        fs::write(dir.join("oh-my-openagent.json"), serde_json::to_string_pretty(&oma).unwrap()).unwrap();

        tmp
    }

    #[test]
    fn test_load_state() {
        let tmp = setup_test_dir();
        let state = load_state_in(tmp.path()).unwrap();

        assert_eq!(state.plugins.len(), 1);
        assert_eq!(state.plugins[0].name, "oh-my-openagent@latest");
        assert!(state.plugins[0].enabled);
        assert!(state.plugins[0].configurable);

        assert_eq!(state.available_models.len(), 2);
        assert!(state.available_models.contains(&"test-provider/model-a".to_string()));

        assert!(state.oma.present);
        assert_eq!(state.oma.agents.len(), 1);
        assert_eq!(state.oma.categories.len(), 1);
    }

    #[test]
    fn test_toggle_plugin_disable() {
        let tmp = setup_test_dir();
        let dir = tmp.path();

        // 禁用插件
        let state = toggle_plugin_in(dir, "oh-my-openagent@latest", false).unwrap();

        // 验证：插件仍在列表但标记为禁用
        assert_eq!(state.plugins.len(), 1);
        assert!(!state.plugins[0].enabled);

        // 验证文件：opencode.json plugin 数组应为空
        let opencode: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join("opencode.json")).unwrap()).unwrap();
        let plugins = opencode["plugin"].as_array().unwrap();
        assert_eq!(plugins.len(), 0);

        // 验证禁用记录文件存在
        let switch_state: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join(".opm.json")).unwrap()).unwrap();
        let disabled = switch_state["disabled_plugins"].as_array().unwrap();
        assert_eq!(disabled.len(), 1);
        assert_eq!(disabled[0].as_str().unwrap(), "oh-my-openagent@latest");
    }

    #[test]
    fn test_toggle_plugin_enable_restore() {
        let tmp = setup_test_dir();
        let dir = tmp.path();

        // 先禁用
        toggle_plugin_in(dir, "oh-my-openagent@latest", false).unwrap();

        // 再启用
        let state = toggle_plugin_in(dir, "oh-my-openagent@latest", true).unwrap();

        // 验证：插件恢复启用
        assert_eq!(state.plugins.len(), 1);
        assert!(state.plugins[0].enabled);

        // 验证文件：opencode.json plugin 数组恢复
        let opencode: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join("opencode.json")).unwrap()).unwrap();
        let plugins = opencode["plugin"].as_array().unwrap();
        assert_eq!(plugins.len(), 1);

        // 验证禁用记录已清空
        let switch_state: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join(".opm.json")).unwrap()).unwrap();
        let disabled = switch_state["disabled_plugins"].as_array().unwrap();
        assert_eq!(disabled.len(), 0);
    }

    #[test]
    fn test_load_state_migrates_legacy_switch_state() {
        let tmp = setup_test_dir();
        let dir = tmp.path();
        let legacy_state = serde_json::json!({
            "disabled_plugins": ["legacy-plugin@1.0.0"]
        });
        fs::write(
            dir.join(".omo-switch.json"),
            serde_json::to_string_pretty(&legacy_state).unwrap(),
        )
        .unwrap();

        let state = load_state_in(dir).unwrap();

        assert!(dir.join(".opm.json").exists());
        assert!(!dir.join(".omo-switch.json").exists());
        assert!(state
            .plugins
            .iter()
            .any(|plugin| plugin.name == "legacy-plugin@1.0.0" && !plugin.enabled));
    }

    #[test]
    fn test_update_agent_model() {
        let tmp = setup_test_dir();
        let dir = tmp.path();

        let state = update_agent_model_in(dir, "agents", "test-agent", "test-provider/model-b").unwrap();

        // 验证状态
        assert_eq!(state.oma.agents[0].model, "test-provider/model-b");

        // 验证文件
        let oma: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join("oh-my-openagent.json")).unwrap()).unwrap();
        assert_eq!(
            oma["agents"]["test-agent"]["model"].as_str().unwrap(),
            "test-provider/model-b"
        );
    }

    #[test]
    fn test_add_plugin() {
        let tmp = setup_test_dir();
        let dir = tmp.path();

        let state = add_plugin_in(dir, "new-plugin@1.0.0").unwrap();

        assert_eq!(state.plugins.len(), 2);
        assert!(state.plugins.iter().any(|p| p.name == "new-plugin@1.0.0" && p.enabled));
    }

    #[test]
    fn test_remove_plugin() {
        let tmp = setup_test_dir();
        let dir = tmp.path();

        let state = remove_plugin_in(dir, "oh-my-openagent@latest").unwrap();

        assert_eq!(state.plugins.len(), 0);
    }
}
