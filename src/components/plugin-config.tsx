import type { LucideIcon } from "lucide-react";
import type { AgentEntry } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusTileProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}

interface ConfigGroupProps {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly entries: readonly AgentEntry[];
  readonly models: readonly string[];
  readonly section: "agents" | "categories";
  readonly getMeta: (key: string) => { readonly label: string; readonly desc: string };
  readonly onUpdateModel: (section: string, key: string, model: string) => void;
}

interface ConfigRowProps {
  readonly entry: AgentEntry;
  readonly models: readonly string[];
  readonly getMeta: (key: string) => { readonly label: string; readonly desc: string };
  readonly onUpdate: (model: string) => void;
}

export const StatusTile = ({ icon: Icon, label, value }: StatusTileProps) => (
  <div className="rounded-lg border bg-muted/24 p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </div>
    <div className="mt-2 truncate text-sm font-medium">{value}</div>
  </div>
);

export const ConfigGroup = ({
  title,
  description,
  icon: Icon,
  entries,
  models,
  section,
  getMeta,
  onUpdateModel,
}: ConfigGroupProps) => (
  <section className="space-y-3">
    <div className="flex items-end justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4" />
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="rounded-md font-mono">
        {entries.length}
      </Badge>
    </div>

    {entries.length > 0 ? (
      <div className="grid gap-2">
        {entries.map((entry) => (
          <ConfigRow
            key={entry.key}
            entry={entry}
            models={models}
            getMeta={getMeta}
            onUpdate={(model) => onUpdateModel(section, entry.key, model)}
          />
        ))}
      </div>
    ) : (
      <div className="rounded-lg border bg-muted/24 px-4 py-5 text-sm text-muted-foreground">暂无配置项</div>
    )}
  </section>
);

const ConfigRow = ({ entry, models, getMeta, onUpdate }: ConfigRowProps) => {
  const meta = getMeta(entry.key);

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3 shadow-xs md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium">{meta.label}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{entry.key}</code>
        </div>
        {meta.desc.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>}
        {entry.fallback_models.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            fallback: {entry.fallback_models.join(", ")}
          </p>
        )}
      </div>

      <Select value={entry.model} onValueChange={onUpdate}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
