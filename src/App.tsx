import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { FileJson, FolderCog, Loader2, RefreshCw, Settings, SlidersHorizontal } from "lucide-react";
import { api, type AppState } from "@/api";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PluginPanel } from "@/components/plugin-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import "@/App.css";

type ViewMode = "plugins" | "settings";

const App = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPluginName, setSelectedPluginName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("plugins");

  const selectedPlugin = useMemo(() => {
    if (state === null || state.plugins.length === 0) {
      return null;
    }

    return (
      state.plugins.find((plugin) => plugin.name === selectedPluginName) ??
      state.plugins[0] ??
      null
    );
  }, [selectedPluginName, state]);

  const omaPluginName = useMemo(() => {
    if (state === null) {
      return null;
    }

    return state.plugins.find((plugin) => plugin.configurable)?.name ?? null;
  }, [state]);

  const reload = async () => {
    try {
      setLoading(true);
      const next = await api.loadState();
      setState(next);
      setSelectedPluginName((currentName) => {
        if (currentName !== null && next.plugins.some((plugin) => plugin.name === currentName)) {
          return currentName;
        }

        return next.plugins[0]?.name ?? null;
      });
    } catch (err) {
      toast.error(`加载失败: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await reload();
    toast.success("配置已刷新");
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleTogglePlugin = async (name: string, enabled: boolean) => {
    try {
      const next = await api.togglePlugin(name, enabled);
      setState(next);
      toast.success(enabled ? `已启用 ${name}` : `已禁用 ${name}`);
    } catch (err) {
      toast.error(`切换失败: ${String(err)}`);
    }
  };

  const handleUpdateModel = async (section: string, key: string, model: string) => {
    try {
      const next = await api.updateAgentModel(section, key, model);
      setState(next);
      toast.success(`${key} 模型已更新`);
    } catch (err) {
      toast.error(`更新失败: ${String(err)}`);
    }
  };

  const handleOpenFile = async (fileName: string) => {
    try {
      await api.openConfigFile(fileName);
    } catch (err) {
      toast.error(`打开文件失败: ${String(err)}`);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          加载配置中
        </div>
      </main>
    );
  }

  if (state === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <Card className="max-w-sm text-center">
          <CardContent className="py-8 text-sm text-destructive">无法加载配置</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster position="bottom-right" richColors />

      <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/76">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FolderCog className="size-3.5" />
              OMO Switch
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">OpenCode 插件控制台</h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">{state.config_dir}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="mr-1 flex rounded-lg border bg-muted/45 p-1">
              <Button
                variant={viewMode === "plugins" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("plugins")}
              >
                <SlidersHorizontal />
                插件
              </Button>
              <Button
                variant={viewMode === "settings" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("settings")}
              >
                <Settings />
                设置
              </Button>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-5">
        {viewMode === "plugins" ? (
          <PluginPanel
            plugins={state.plugins}
            selectedPlugin={selectedPlugin}
            selectedPluginName={selectedPluginName}
            omaPluginName={omaPluginName}
            agents={state.oma.agents}
            categories={state.oma.categories}
            models={state.available_models}
            omaPresent={state.oma.present}
            onSelectPlugin={setSelectedPluginName}
            onTogglePlugin={handleTogglePlugin}
            onUpdateModel={handleUpdateModel}
            onOpenFile={handleOpenFile}
          />
        ) : (
          <SettingsView state={state} onOpenFile={handleOpenFile} onRefresh={handleRefresh} />
        )}
      </main>
    </div>
  );
};

interface SettingsViewProps {
  readonly state: AppState;
  readonly onOpenFile: (fileName: string) => void;
  readonly onRefresh: () => void;
}

const SettingsView = ({ state, onOpenFile, onRefresh }: SettingsViewProps) => {
  const enabledCount = state.plugins.filter((plugin) => plugin.enabled).length;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <Card className="py-0">
          <CardHeader className="border-b px-5 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="size-4" />
                  设置
                </CardTitle>
                <CardDescription className="mt-1">管理本地 OpenCode 配置文件与界面偏好</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw />
                刷新配置
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="rounded-lg border bg-muted/28 p-4">
              <div className="text-sm font-medium">配置目录</div>
              <p className="mt-2 break-all rounded-md bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                {state.config_dir}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FileOpenCard
                title="OpenCode 主配置"
                description="插件列表、provider 与模型定义"
                fileName="opencode.json"
                onOpenFile={onOpenFile}
              />
              <FileOpenCard
                title="oh-my-openagent 配置"
                description="Agent 与 category 的模型路由"
                fileName="oh-my-openagent.json"
                onOpenFile={onOpenFile}
              />
              <FileOpenCard
                title="TUI 插件配置"
                description="与主配置同步的 plugin 列表"
                fileName="tui.json"
                onOpenFile={onOpenFile}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">当前状态</CardTitle>
            <CardDescription>实时读取自全局配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SettingStat label="插件数量" value={`${state.plugins.length}`} />
            <SettingStat label="已启用" value={`${enabledCount}`} />
            <SettingStat label="可用模型" value={`${state.available_models.length}`} />
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/28 px-3 py-2">
              <span className="text-muted-foreground">OpenAgent 配置</span>
              <Badge variant={state.oma.present ? "default" : "outline"}>{state.oma.present ? "已检测" : "未检测"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">界面主题</CardTitle>
            <CardDescription>右上角可切换浅色、深色或跟随系统</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            当前深色模式使用柔和石墨灰，避免纯黑背景。
          </CardContent>
        </Card>
      </aside>
    </section>
  );
};

interface FileOpenCardProps {
  readonly title: string;
  readonly description: string;
  readonly fileName: string;
  readonly onOpenFile: (fileName: string) => void;
}

const FileOpenCard = ({ title, description, fileName, onOpenFile }: FileOpenCardProps) => (
  <div className="rounded-lg border bg-card p-4 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <code className="mt-3 inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{fileName}</code>
      </div>
      <Button variant="outline" size="sm" onClick={() => onOpenFile(fileName)}>
        <FileJson />
        打开
      </Button>
    </div>
  </div>
);

const SettingStat = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex items-center justify-between rounded-lg border bg-muted/28 px-3 py-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono font-medium">{value}</span>
  </div>
);

export default App;
