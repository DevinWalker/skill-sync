import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useMode } from "@/hooks/use-mode";
import { activitySentence } from "@/lib/activity-sentence";
import { friendlyTime } from "@/lib/time";
import { ipc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/types/bindings";

type FilterId = "all" | "sync" | "pull" | "package";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "sync",    label: "Sync" },
  { id: "pull",    label: "Pull-back" },
  { id: "package", label: "Package" },
];

function matchFilter(kind: string, f: FilterId): boolean {
  if (f === "all") return true;
  if (f === "sync")    return kind === "sync.execute";
  if (f === "pull")    return kind === "sync.pull_back";
  if (f === "package") return kind === "package.build";
  return false;
}

function tone(kind: string): "primary" | "info" | "violet" | "default" {
  if (kind === "sync.execute") return "primary";
  if (kind === "sync.pull_back") return "info";
  if (kind === "package.build") return "violet";
  return "default";
}

function detailFor(e: AuditEntry): string {
  const data = e.data ?? {};
  switch (e.kind) {
    case "sync.execute":   return `${data.rows ?? 0} change${data.rows === 1 ? "" : "s"}`;
    case "sync.pull_back": return String(data.label ?? "—");
    case "package.build":  return String(data.skill ?? "—");
    default:               return "—";
  }
}

function outcomeFor(e: AuditEntry): string {
  const data = e.data ?? {};
  if (e.kind === "package.build" && data.out) return String(data.out);
  return "—";
}

function dotColorFor(kind: string): string {
  switch (kind) {
    case "sync.execute":
    case "sync.commit": return "var(--primary)";
    case "sync.pull_back":
    case "pull.back": return "var(--info)";
    case "drift.detected": return "var(--warning)";
    case "refused": return "var(--danger)";
    case "package.build": return "var(--violet)";
    case "archive": return "var(--fg-dim)";
    default: return "var(--fg-dim)";
  }
}

export function ActivityList() {
  const mode = useMode();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await ipc.readAudit(1000);
        if (!cancelled) setEntries(list);
      } catch { /* empty */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = entries.filter((e) => matchFilter(e.kind, filter));
  const shown = filtered.slice(0, limit);

  return (
    <div className="px-8 pb-12">
      <div className="mb-4 inline-flex items-center gap-0.5 p-0.5 bg-card border border-border rounded-md">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-2.5 py-1 rounded font-mono text-[11px] text-muted-foreground transition-colors",
              filter === f.id ? "bg-bg-hover text-foreground ring-1 ring-border-strong" : "hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {mode === "simple" ? (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <ul>
            {shown.map((e, i) => (
              <li key={i} className="grid grid-cols-[150px_1fr_auto] gap-x-3 items-center px-3.5 py-2.5 border-b border-border last:border-b-0 hover:bg-bg-hover">
                <div className="font-mono text-[11px] text-fg-dim">{friendlyTime(e.ts)}</div>
                <div className="text-[13.5px]">{activitySentence(e)}</div>
                <div>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: dotColorFor(e.kind) }}
                    aria-hidden
                  />
                </div>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <button
              onClick={() => setLimit((l) => l + 50)}
              className="w-full py-3 font-mono text-[11px] text-muted-foreground hover:text-foreground border-t border-border"
            >
              Load 50 more · {filtered.length - limit} remaining
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="grid grid-cols-[120px_120px_1fr_120px_140px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">Time</div>
            <div className="eyebrow">Kind</div>
            <div className="eyebrow">Detail</div>
            <div className="eyebrow">Target</div>
            <div className="eyebrow">Outcome</div>
          </div>
          <ul>
            {shown.map((e, i) => {
              const ts = e.ts.replace("T", " ").replace(/\.\d+Z?$/, "");
              return (
                <li key={i} className="grid grid-cols-[120px_120px_1fr_120px_140px] gap-x-3 items-center px-3.5 py-2.5 border-b border-border last:border-b-0 hover:bg-bg-hover">
                  <div className="font-mono text-[11px] text-fg-dim">{ts}</div>
                  <div><Badge variant={tone(e.kind)}>{e.kind}</Badge></div>
                  <div className="font-mono text-[11.5px] text-muted-foreground truncate">{detailFor(e)}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">—</div>
                  <div className="font-mono text-[11px] text-muted-foreground truncate" title={outcomeFor(e)}>{outcomeFor(e)}</div>
                </li>
              );
            })}
          </ul>
          {filtered.length > limit && (
            <button
              onClick={() => setLimit((l) => l + 50)}
              className="w-full py-3 font-mono text-[11px] text-muted-foreground hover:text-foreground border-t border-border"
            >
              Load 50 more · {filtered.length - limit} remaining
            </button>
          )}
        </div>
      )}
    </div>
  );
}
