import {
  CheckCircle2,
  FileJson,
  Layers3,
  PackageCheck,
  Plug,
  Power,
  SlidersHorizontal,
} from "lucide-react";
import type { AgentEntry, PluginItem } from "@/api";
import { ConfigGroup, StatusTile } from "@/components/plugin-config";
import { getAgentMeta, getCategoryMeta } from "@/meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PluginPanelProps {
  readonly plugins: readonly PluginItem[];
  readonly selectedPlugin: PluginItem | null;
  readonly selectedPluginName: string | null;
  readonly omaPluginName: string | null;
  readonly agents: readonly AgentEntry[];
  readonly categories: readonly AgentEntry[];
  readonly models: readonly string[];
  readonly omaPresent: boolean;
  readonly onSelectPlugin: (name: string) => void;
  readonly onTogglePlugin: (name: string, enabled: boolean) => void;
  readonly onUpdateModel: (section: string, key: string, model: string) => void;
  readonly onOpenFile: (fileName: string) => void;
}

export const PluginPanel = ({
  plugins,
  selectedPlugin,
  selectedPluginName,
  omaPluginName,
  agents,
  categories,
  models,
  omaPresent,
  onSelectPlugin,
  onTogglePlugin,
  onUpdateModel,
  onOpenFile,
}: PluginPanelProps) => {
  const enabledCount = plugins.filter((plugin) => plugin.enabled).length;
  const selectedHasOmaConfig = selectedPlugin !== null && selectedPlugin.name === omaPluginName;

  if (plugins.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-80 items-center justify-center py-12 text-sm text-muted-foreground">
          暂无插件
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid min-h-[calc(100dvh-7rem)] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-3 border-b px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">插件</CardTitle>
              <CardDescription className="mt-1 text-xs">
                {enabledCount}/{plugins.length} 已启用
              </CardDescription>
            </div>
            <Badge variant="outline" className="rounded-md font-mono">
              {plugins.length}
            </Badge>
          </div>
        </CardHeader>

        <nav className="max-h-[calc(100dvh-13rem)] space-y-1 overflow-y-auto p-2" aria-label="插件列表">
          {plugins.map((plugin) => {
            const active = plugin.name === selectedPluginName || plugin.name === selectedPlugin?.name;

            return (
              <button
                key={plugin.name}
                type="button"
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
                onClick={() => onSelectPlugin(plugin.name)}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md border bg-background transition-colors",
                    active && "border-primary/20 bg-primary text-primary-foreground",
                  )}
                >
                  <Plug className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{plugin.base_name}</span>
                    {plugin.version.length > 0 && (
                      <Badge variant="secondary" className="rounded-md font-mono text-[0.68rem]">
                        v{plugin.version}
                      </Badge>
                    )}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs">
                    <span className={plugin.enabled ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
                      {plugin.enabled ? "已启用" : "已禁用"}
                    </span>
                    {plugin.configurable && <span>可配置</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </Card>

      <Card className="min-w-0 overflow-hidden py-0">
        {selectedPlugin === null ? (
          <CardContent className="flex min-h-80 items-center justify-center py-12 text-sm text-muted-foreground">
            选择一个插件查看详情
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-2xl tracking-tight">{selectedPlugin.base_name}</CardTitle>
                    {selectedPlugin.version.length > 0 && (
                      <Badge variant="secondary" className="rounded-md font-mono">
                        v{selectedPlugin.version}
                      </Badge>
                    )}
                    <Badge variant={selectedPlugin.enabled ? "default" : "outline"} className="rounded-md">
                      {selectedPlugin.enabled ? "已启用" : "已禁用"}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2 break-all font-mono text-xs">
                    {selectedPlugin.name}
                  </CardDescription>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                  <Power className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">启用插件</span>
                  <Switch
                    checked={selectedPlugin.enabled}
                    onCheckedChange={(enabled) => onTogglePlugin(selectedPlugin.name, enabled)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <StatusTile icon={PackageCheck} label="插件标识" value={selectedPlugin.base_name} />
                <StatusTile
                  icon={CheckCircle2}
                  label="配置能力"
                  value={selectedPlugin.configurable ? "可配置" : "无需配置"}
                />
                <StatusTile icon={Layers3} label="可用模型" value={`${models.length} 个`} />
              </div>

              <Separator />

              {selectedHasOmaConfig ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <SlidersHorizontal className="size-4" />
                        oh-my-openagent 配置
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Agent 与 category 的模型只在当前插件详情中编辑。
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onOpenFile("oh-my-openagent.json")}>
                      <FileJson />
                      打开配置
                    </Button>
                  </div>

                  {!omaPresent && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                      未检测到 oh-my-openagent.json
                    </div>
                  )}

                  <ConfigGroup
                    title="Agents"
                    description="角色执行者"
                    icon={PackageCheck}
                    entries={agents}
                    models={models}
                    section="agents"
                    getMeta={getAgentMeta}
                    onUpdateModel={onUpdateModel}
                  />

                  <ConfigGroup
                    title="Categories"
                    description="任务分类路由"
                    icon={Layers3}
                    entries={categories}
                    models={models}
                    section="categories"
                    getMeta={getCategoryMeta}
                    onUpdateModel={onUpdateModel}
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center">
                  <p className="text-sm font-medium">此插件没有右侧可编辑配置</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    可在左侧继续切换启用状态，或打开 opencode.json 查看插件列表。
                  </p>
                  <Button className="mt-4" variant="outline" size="sm" onClick={() => onOpenFile("opencode.json")}>
                    <FileJson />
                    打开 opencode.json
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </section>
  );
};
