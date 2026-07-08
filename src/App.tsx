import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { FolderCog, Loader2, Settings, SlidersHorizontal } from "lucide-react";
import { api, type AppState } from "@/api";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PluginPanel } from "@/components/plugin-panel";
import { SettingsView } from "@/components/settings-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import "@/App.css";

type ViewMode = "plugins" | "settings";

const APP_VERSION = "0.4.3";

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
              opencode-plugin-manager
              <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                v{APP_VERSION}
              </Badge>
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
          <SettingsView appVersion={APP_VERSION} state={state} onOpenFile={handleOpenFile} onRefresh={handleRefresh} />
        )}
      </main>
    </div>
  );
};

export default App;
