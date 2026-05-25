import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ipc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/types/bindings";

type FilterId = "all" | "sync" | "pull" | "package" | "refused" | "drift";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "sync",    label: "Sync" },
  { id: "pull",    label: "Pull" },
  { id: "package", label: "Package" },
  { id: "refused", label: "Refused" },
  { id: "drift",   label: "Drift" },
];

function matchFilter(kind: string, f: FilterId): boolean {
  if (f === "all") return true;
  if (f === "sync")    return kind === "sync" || kind === "archive";
  if (f === "pull")    return kind === "pull-back" || kind === "pull";
  if (f === "package") return kind === "package" || kind === "build-skill";
  if (f === "refused") return kind === "refused";
  if (f === "drift")   return kind === "drift-detected" || kind === "drift";
  return false;
}

function tone(kind: string): "primary" | "info" | "violet" | "danger" | "warning" | "default" {
  if (kind === "sync" || kind === "archive") return "primary";
  if (kind === "pull-back" || kind === "pull") return "info";
  if (kind === "package" || kind === "build-skill") return "violet";
  if (kind === "refused") return "danger";
  if (kind.startsWith("drift")) return "warning";
  return "default";
}

export function ActivityList() {
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
            const data = e.data ?? {};
            return (
              <li key={i} className="grid grid-cols-[120px_120px_1fr_120px_140px] gap-x-3 items-center px-3.5 py-2.5 border-b border-border last:border-b-0 hover:bg-bg-hover">
                <div className="font-mono text-[11px] text-fg-dim">{ts}</div>
                <div><Badge variant={tone(e.kind)}>{e.kind}</Badge></div>
                <div className="font-mono text-[11.5px] text-muted-foreground truncate">
                  {String(data.skill ?? data.name ?? "—")}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">{String(data.target ?? "—")}</div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{String(data.outcome ?? data.reason ?? "—")}</div>
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
    </div>
  );
}
