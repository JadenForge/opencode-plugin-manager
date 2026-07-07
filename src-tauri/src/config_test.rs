#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn setup_test_dir() -> (TempDir, PathBuf) {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path().to_path_buf();

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

        (tmp, dir)
    }

    #[test]
    fn test_load_state() {
        let (_tmp, dir) = setup_test_dir();
        let state = load_state_in(&dir).unwrap();

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
        let (_tmp, dir) = setup_test_dir();

        // 禁用插件
        let state = toggle_plugin_in(&dir, "oh-my-openagent@latest", false).unwrap();

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
            serde_json::from_str(&fs::read_to_string(dir.join(".omo-switch.json")).unwrap()).unwrap();
        let disabled = switch_state["disabled_plugins"].as_array().unwrap();
        assert_eq!(disabled.len(), 1);
        assert_eq!(disabled[0].as_str().unwrap(), "oh-my-openagent@latest");
    }

    #[test]
    fn test_toggle_plugin_enable_restore() {
        let (_tmp, dir) = setup_test_dir();

        // 先禁用
        toggle_plugin_in(&dir, "oh-my-openagent@latest", false).unwrap();

        // 再启用
        let state = toggle_plugin_in(&dir, "oh-my-openagent@latest", true).unwrap();

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
            serde_json::from_str(&fs::read_to_string(dir.join(".omo-switch.json")).unwrap()).unwrap();
        let disabled = switch_state["disabled_plugins"].as_array().unwrap();
        assert_eq!(disabled.len(), 0);
    }

    #[test]
    fn test_update_agent_model() {
        let (_tmp, dir) = setup_test_dir();

        let state = update_agent_model_in(&dir, "agents", "test-agent", "test-provider/model-b").unwrap();

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
        let (_tmp, dir) = setup_test_dir();

        let state = add_plugin_in(&dir, "new-plugin@1.0.0").unwrap();

        assert_eq!(state.plugins.len(), 2);
        assert!(state.plugins.iter().any(|p| p.name == "new-plugin@1.0.0" && p.enabled));
    }

    #[test]
    fn test_remove_plugin() {
        let (_tmp, dir) = setup_test_dir();

        let state = remove_plugin_in(&dir, "oh-my-openagent@latest").unwrap();

        assert_eq!(state.plugins.len(), 0);
    }
}
