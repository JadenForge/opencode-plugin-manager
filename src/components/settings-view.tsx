import { FileJson, RefreshCw, Settings } from "lucide-react";
import type { AppState } from "@/api";
import { UpdateChecker } from "@/components/update-checker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsViewProps {
  readonly appVersion: string;
  readonly state: AppState;
  readonly onOpenFile: (fileName: string) => void;
  readonly onRefresh: () => void;
}

interface FileOpenCardProps {
  readonly title: string;
  readonly description: string;
  readonly fileName: string;
  readonly onOpenFile: (fileName: string) => void;
}

export const SettingsView = ({ appVersion, state, onOpenFile, onRefresh }: SettingsViewProps) => {
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
        <UpdateChecker currentVersion={appVersion} />

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
      </aside>
    </section>
  );
};

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
