// Tauri 后端类型定义与 API 封装层。

import { invoke } from "@tauri-apps/api/core";

export interface PluginItem {
  name: string;
  base_name: string;
  version: string;
  enabled: boolean;
  configurable: boolean;
}

export interface AgentEntry {
  key: string;
  model: string;
  fallback_models: string[];
}

export interface OmaConfig {
  present: boolean;
  agents: AgentEntry[];
  categories: AgentEntry[];
}

export interface AppState {
  config_dir: string;
  plugins: PluginItem[];
  available_models: string[];
  oma: OmaConfig;
}

export const api = {
  loadState: () => invoke<AppState>("load_state"),
  
  togglePlugin: (name: string, enabled: boolean) =>
    invoke<AppState>("toggle_plugin", { name, enabled }),
  
  addPlugin: (name: string) =>
    invoke<AppState>("add_plugin", { name }),
  
  removePlugin: (name: string) =>
    invoke<AppState>("remove_plugin", { name }),
  
  updateAgentModel: (section: string, key: string, model: string) =>
    invoke<AppState>("update_agent_model", { section, key, model }),
  
  configDir: () => invoke<string>("config_dir"),
  
  openConfigFile: (fileName: string) =>
    invoke<void>("open_config_file", { fileName }),
};
