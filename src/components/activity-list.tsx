import { useEffect, useState } from "react";
import { activitySentence } from "@/lib/activity-sentence";
import { strings } from "@/lib/copy";
import { friendlyTime } from "@/lib/time";
import { ipc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/types/bindings";

type FilterId = "all" | "sync" | "pull" | "archive" | "drift";

const simpleFilterIds = ["all", "sync", "pull", "archive", "drift"] as const;

function matchFilter(kind: string, f: FilterId): boolean {
  if (f === "all") return true;
  if (f === "sync")    return kind === "sync.execute" || kind === "sync.commit";
  if (f === "pull")    return kind === "sync.pull_back" || kind === "pull.back";
  if (f === "archive") return kind === "archive";
  if (f === "drift")   return kind === "drift.detected";
  return false;
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
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [limit, setLimit] = useState(50);

  // Build filter chips from Simple filter set
  const ids = simpleFilterIds;
  const labels = strings.activityFilters;
  const filterChips = labels.map((label, i) => ({ id: ids[i] as FilterId, label }));

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
        {filterChips.map((f) => (
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
    </div>
  );
}
