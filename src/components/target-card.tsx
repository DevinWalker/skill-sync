import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { HealthBar } from "./health-bar";
import { useDrift } from "@/hooks/use-drift";
import { useSettings, useSetSettings } from "@/hooks/use-settings";
import { useCopy } from "@/hooks/use-copy";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { ipc } from "@/lib/ipc";
import type { DriftStatus } from "@/types/bindings";

interface Props {
  name: string;
  path: string | undefined;
  kind: "directory-mirror" | "package-only";
}

const PRETTY: Record<string, string> = {
  claude: "Claude Code",
  codex:  "Codex",
  cursor: "Cursor",
  cowork: "Cowork (zip)",
};

export function TargetCard({ name, path, kind }: Props) {
  const c = useCopy();
  const drift = useDrift();
  const { data: settings } = useSettings();
  const enabled = useMemo(() => new Set(settings?.enabled_targets ?? []), [settings?.enabled_targets]);
  const isEnabled = enabled.has(name);

  const counts = useMemo(() => {
    let inSync = 0, d = 0, missing = 0, refused = 0;
    for (const row of Object.values(drift.data ?? {})) {
      const s = (row as Record<string, DriftStatus>)[name];
      if (s === "in-sync") inSync++;
      else if (s === "drifted-source-newer" || s === "drifted-target-newer") d++;
      else if (s === "missing-in-target") missing++;
      else if (s === "refused") refused++;
    }
    return { inSync, drift: d, missing, refused };
  }, [drift.data, name]);

  const update = useSetSettings();

  const toggle = () => {
    if (!settings) return;
    const next = isEnabled
      ? settings.enabled_targets.filter((t) => t !== name)
      : [...settings.enabled_targets, name];
    update.mutate({ ...settings, enabled_targets: next });
  };

  const reveal = () => {
    if (path) revealItemInDir(path).catch(() => {});
  };
  const test = () => {
    if (path) ipc.testTargetWrite(path).catch(() => {});
  };

  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-foreground text-[17px] font-medium leading-tight">
            {PRETTY[name] ?? name}
          </div>
          <div className="font-mono text-[11px] text-fg-faint mt-1 truncate" title={path ?? ""}>
            {path ? path.replace(/^.*\/Users\/[^/]+/, "~") : (kind === "package-only" ? "output directory in Settings" : "not configured")}
          </div>
        </div>
        {!isEnabled ? <Badge variant="default">{c.targetStatusOff}</Badge>
          : !path && kind === "directory-mirror" ? <Badge variant="warning">{c.targetStatusNotSetUp}</Badge>
          : <Badge variant="primary"><span className="w-1.5 h-1.5 rounded-full bg-current"/>{c.targetStatusActive}</Badge>}
      </div>

      <div className="mt-5">
        <HealthBar inSync={counts.inSync} drift={counts.drift} missing={counts.missing} refused={counts.refused} />
        <div className="mt-2 font-mono text-[11px] text-muted-foreground">
          {c.healthBarLabel(counts.inSync, counts.drift, counts.refused)}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={reveal}
          disabled={!path}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          {c.showInFinder}
        </button>
        <button
          onClick={test}
          disabled={!path}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          {c.testConnection}
        </button>
        <button
          onClick={toggle}
          disabled={update.isPending}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          {isEnabled ? c.turnOff : c.turnOn}
        </button>
      </div>
    </div>
  );
}
