# opencode-plugin-manager

`opencode-plugin-manager` 是一个基于 Tauri + React 的 OpenCode 插件管理工具，用来查看、启用、禁用本机 OpenCode 插件，并管理 `oh-my-openagent` 的模型路由配置。

当前版本：`0.3.1`

## 功能

- 读取 `~/.config/opencode/opencode.json` 中的插件列表。
- 同步维护 `opencode.json` 与 `tui.json` 的 `plugin` 配置。
- 启用或禁用插件，禁用状态记录在 `~/.config/opencode/.opm.json`。
- 识别插件名称中的版本号，例如 `oh-my-openagent@latest`。
- 读取 `opencode.json` 中的 provider/model，作为可选模型列表。
- 管理 `oh-my-openagent.json` 中 agents 与 categories 的 `model` 字段。
- 从界面直接打开 OpenCode 相关配置文件。

## 配置文件

工具默认读取当前用户目录下的 OpenCode 配置：

```text
~/.config/opencode/opencode.json
~/.config/opencode/tui.json
~/.config/opencode/oh-my-openagent.json
~/.config/opencode/.opm.json
```

其中 `.opm.json` 由本工具维护，用于保存被禁用但仍可恢复的插件名称。首次运行新版时，如果检测到旧的 `.omo-switch.json` 且 `.opm.json` 不存在，会自动迁移到新文件名。

## 开发

安装依赖：

```bash
bun install
```

启动前端开发服务：

```bash
bun run dev
```

启动 Tauri 应用：

```bash
bun run tauri dev
```

构建前端：

```bash
bun run build
```

构建桌面应用：

```bash
bun run tauri build
```

## 自动构建与发布

仓库包含 GitHub Actions 配置：

- `CI`：推送到 `main` 或创建 pull request 时运行，执行前端构建和 Rust 测试。
- `Release`：推送 `v*` 版本标签时运行，在 macOS、Linux 和 Windows 上构建 Tauri 安装包，并创建 GitHub draft release。

发布新版本时，先确认项目版本号已同步更新，然后创建并推送标签：

```bash
git tag v0.3.1
git push origin v0.3.1
```

GitHub 会自动创建草稿 release，并把各平台构建产物上传为附件。

## 技术栈

- Tauri 2
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- lucide-react

## 注意事项

- 工具会写入 OpenCode 配置文件，建议在修改前确认配置已备份或已纳入版本管理。
- 禁用插件不会删除插件名称，而是从启用列表移除并记录到 `.opm.json`，方便之后恢复。
- 当前应用仅操作本机 `~/.config/opencode` 下的配置，不会自动同步远程仓库。
