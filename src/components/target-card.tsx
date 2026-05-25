import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { HealthBar } from "./health-bar";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
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
        {!isEnabled ? <Badge variant="default">Disabled</Badge>
          : !path && kind === "directory-mirror" ? <Badge variant="warning">Not configured</Badge>
          : <Badge variant="primary"><span className="w-1.5 h-1.5 rounded-full bg-current"/>Active</Badge>}
      </div>

      <div className="mt-5">
        <HealthBar inSync={counts.inSync} drift={counts.drift} missing={counts.missing} refused={counts.refused} />
        <div className="mt-2 font-mono text-[11px] text-muted-foreground">
          <span className="text-primary">{counts.inSync}</span> in sync ·
          {" "}<span className={counts.drift ? "text-warning" : ""}>{counts.drift}</span> drift ·
          {" "}<span>{counts.missing}</span> missing ·
          {" "}<span className={counts.refused ? "text-destructive" : ""}>{counts.refused}</span> refused
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={reveal}
          disabled={!path}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          Reveal in Finder
        </button>
        <button
          onClick={test}
          disabled={!path}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          Test
        </button>
      </div>
    </div>
  );
}
