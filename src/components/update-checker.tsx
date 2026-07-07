import { useState } from "react";
import { CheckCircle2, Download, Loader2, RefreshCw, Rocket, TriangleAlert } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UpdateStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "checking" }
  | { readonly kind: "up-to-date" }
  | { readonly kind: "update-available"; readonly update: Update }
  | { readonly kind: "installing"; readonly update: Update }
  | { readonly kind: "installed" }
  | { readonly kind: "error"; readonly message: string };

interface UpdateCheckerProps {
  readonly currentVersion: string;
}

const getErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("valid release JSON")) {
    return `远端更新清单不是有效的 Tauri release JSON。请确认 latest.json 已按 Tauri updater 格式上传到 GitHub release。原始错误：${message}`;
  }

  if (message.includes("latest.json") || message.includes("error sending request")) {
    return `未找到更新清单 latest.json。请先发布包含 latest.json 的 GitHub release 后再检查更新。原始错误：${message}`;
  }

  return message;
};

const getStatusBadge = (status: UpdateStatus) => {
  switch (status.kind) {
    case "idle":
      return <Badge variant="outline">未检查</Badge>;
    case "checking":
      return <Badge variant="secondary">检查中</Badge>;
    case "up-to-date":
      return <Badge variant="default">已是最新</Badge>;
    case "update-available":
      return <Badge variant="default">可更新</Badge>;
    case "installing":
      return <Badge variant="secondary">安装中</Badge>;
    case "installed":
      return <Badge variant="default">已安装</Badge>;
    case "error":
      return <Badge variant="destructive">检查失败</Badge>;
  }
};

const getStatusText = (status: UpdateStatus) => {
  switch (status.kind) {
    case "idle":
      return "检查 GitHub release 中的 latest.json。";
    case "checking":
      return "正在检查是否有新版本。";
    case "up-to-date":
      return "当前版本已是最新。";
    case "update-available":
      return `发现新版本 v${status.update.version}。`;
    case "installing":
      return `正在下载并安装 v${status.update.version}。`;
    case "installed":
      return "更新已安装，正在重启应用。";
    case "error":
      return status.message;
  }
};

export const UpdateChecker = ({ currentVersion }: UpdateCheckerProps) => {
  const [status, setStatus] = useState<UpdateStatus>({ kind: "idle" });

  const handleCheckUpdate = async () => {
    setStatus({ kind: "checking" });

    try {
      const update = await api.checkForUpdate();

      if (update === null) {
        setStatus({ kind: "up-to-date" });
        return;
      }

      setStatus({ kind: "update-available", update });
    } catch (error) {
      setStatus({ kind: "error", message: getErrorMessage(error) });
    }
  };

  const handleInstallUpdate = async (update: Update) => {
    setStatus({ kind: "installing", update });

    try {
      await api.installUpdate(update);
      setStatus({ kind: "installed" });
      await api.relaunchApp();
    } catch (error) {
      setStatus({ kind: "error", message: getErrorMessage(error) });
    }
  };

  const checking = status.kind === "checking";
  const installing = status.kind === "installing";
  const busy = checking || installing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="size-4" />
              应用更新
            </CardTitle>
            <CardDescription className="mt-1">当前版本 v{currentVersion}</CardDescription>
          </div>
          {getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-lg border bg-muted/28 px-3 py-2 text-muted-foreground">
          <div className="flex items-start gap-2">
            {status.kind === "error" ? <TriangleAlert className="mt-0.5 size-4 text-destructive" /> : null}
            {status.kind === "up-to-date" || status.kind === "installed" ? (
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-700 dark:text-emerald-300" />
            ) : null}
            <span className="min-w-0 break-words">{getStatusText(status)}</span>
          </div>
        </div>

        {status.kind === "update-available" ? (
          <Button className="w-full" size="sm" onClick={() => handleInstallUpdate(status.update)}>
            <Download />
            立即更新
          </Button>
        ) : (
          <Button className="w-full" variant="outline" size="sm" disabled={busy} onClick={handleCheckUpdate}>
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {checking ? "检查中" : installing ? "安装中" : "检查更新"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
