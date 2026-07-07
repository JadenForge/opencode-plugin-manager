// omo-switch: 管理 opencode 插件与 oh-my-openagent 配置的桌面工具后端。
//
// 设计要点：
// - opencode.json / tui.json 的 `plugin` 数组只保存“启用中”的插件。
// - 被禁用的插件不会从数组直接删除后丢失，而是记录到独立状态文件
//   `~/.config/opencode/.omo-switch.json` 中，随时可恢复。
// - 所有 JSON 写回均保留原有键顺序（serde_json preserve_order feature）。

mod config;
mod error;

use config::{AppState, PluginItem};
use error::CmdResult;

/// 读取全部配置：插件列表（含禁用态）、可选模型、oh-my-openagent agent/category 模型。
#[tauri::command]
fn load_state() -> CmdResult<AppState> {
    config::load_state().map_err(Into::into)
}

/// 启用 / 禁用某个插件。enabled=true 表示写回 plugin 数组，false 表示移入禁用记录。
#[tauri::command]
fn toggle_plugin(name: String, enabled: bool) -> CmdResult<AppState> {
    config::toggle_plugin(&name, enabled).map_err(Into::into)
}

/// 新增一个插件（写入 plugin 数组，默认启用）。
#[tauri::command]
fn add_plugin(name: String) -> CmdResult<AppState> {
    config::add_plugin(&name).map_err(Into::into)
}

/// 彻底移除一个插件（同时从启用数组与禁用记录中删除）。
#[tauri::command]
fn remove_plugin(name: String) -> CmdResult<AppState> {
    config::remove_plugin(&name).map_err(Into::into)
}

/// 修改 oh-my-openagent.json 中某个 agent 或 category 的模型。
/// `section` 取值 "agents" 或 "categories"。
#[tauri::command]
fn update_agent_model(section: String, key: String, model: String) -> CmdResult<AppState> {
    config::update_agent_model(&section, &key, &model).map_err(Into::into)
}

/// 返回当前使用的配置目录路径，便于前端展示。
#[tauri::command]
fn config_dir() -> CmdResult<String> {
    config::config_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(Into::into)
}

/// 在系统默认编辑器中打开指定的配置文件。
#[tauri::command]
fn open_config_file(file_name: String) -> CmdResult<()> {
    config::open_config_file(&file_name).map_err(Into::into)
}

/// 供前端展示的插件列表（此命令仅为类型引用锚点，实际数据由 load_state 提供）。
#[allow(dead_code)]
fn _type_anchor(_: PluginItem) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_state,
            toggle_plugin,
            add_plugin,
            remove_plugin,
            update_agent_model,
            config_dir,
            open_config_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
