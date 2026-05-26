import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LibraryTable } from "@/components/library-table";
import { SyncPreviewDialog } from "@/components/sync-preview-dialog";
import { SkillDetailDrawer } from "@/components/skill-detail-drawer";
import { Sparkline } from "@/components/sparkline";
import { Kbd } from "@/components/ui/kbd";
import { usePrimaryAction, usePrimarySearch } from "@/lib/shortcut-contexts";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { usePlanSync, usePullBack } from "@/hooks/use-sync";
import { useDriftRefresh } from "@/hooks/use-drift-refresh";
import { useCopy } from "@/hooks/use-copy";
import { useMode } from "@/hooks/use-mode";
import { bucketArchivesByDay } from "@/lib/audit";
import { deriveOrphans, type Orphan } from "@/lib/orphans";
import { OrphanRow } from "@/components/orphan-row";
import { ipc } from "@/lib/ipc";
import type { AuditEntry, DriftStatus, SyncPlan } from "@/types/bindings";
import { cn } from "@/lib/utils";
import { useUIState } from "@/store/ui-state";

type OwnershipFilter = "all" | "mine" | "bundle" | "builtin" | "unknown" | "out-of-sync" | "orphan";

export function LibraryPage() {
  useDriftRefresh();
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const { data: settings } = useSettings();
  const c = useCopy();
  const mode = useMode();
  const setNewSkillOpen = useUIState((s) => s.setNewSkillOpen);

  const FILTERS_SIMPLE: { id: OwnershipFilter; label: string }[] = [
    { id: "all",         label: "All" },
    { id: "mine",        label: "Mine" },
    { id: "unknown",     label: "Unknown" },
    { id: "out-of-sync", label: "Out of sync" },
  ];
  const FILTERS_PRO: { id: OwnershipFilter; label: string }[] = [
    { id: "all",     label: "All" },
    { id: "mine",    label: "Mine" },
    { id: "bundle",  label: "Bundle" },
    { id: "builtin", label: "Built-in" },
    { id: "unknown", label: "Unknown" },
  ];
  const FILTERS = mode === "simple" ? FILTERS_SIMPLE : FILTERS_PRO;

  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get("filter");

  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const planMut = usePlanSync();
  const pullBack = usePullBack();
  const orphans = useMemo(
    () => deriveOrphans(skills.data ?? [], drift.data ?? {}),
    [skills.data, drift.data]
  );
  const claim = (o: Orphan) => pullBack.mutate({ skill: o.name, target: o.tools[0] });
  const removeFromTarget = (name: string, tool: string) => {
    alert(`Removing "${name}" from ${tool} isn't wired yet. Open the folder in Finder and delete it manually.`);
  };
  const [filter, setFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const search = usePrimarySearch();
  const action = usePrimaryAction();
  const [archiveEntries, setArchiveEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    search.register(searchRef);
  }, [search]);

  useEffect(() => {
    action.setAction(() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) }), "Sync mine");
    return () => action.setAction(null);
  }, [action, planMut]);

  useEffect(() => {
    if (!urlFilter) return;
    const valid = ["all", "mine", "bundle", "builtin", "unknown", "out-of-sync", "orphan"] as const;
    if ((valid as readonly string[]).includes(urlFilter)) {
      setOwnershipFilter(urlFilter as OwnershipFilter);
    }
  }, [urlFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await ipc.readAudit(500);
        if (!cancelled) setArchiveEntries(list);
      } catch {
        /* audit might be empty */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const all = skills.data ?? [];
    const ownerOf = (name: string) => ownership.data?.skills?.[name];
    const isMine = (name: string, klass: string) => ownerOf(name)?.class === "mine" || klass === "MineHeuristic";

    let mine = 0, bundle = 0, builtin = 0, unknown = 0;
    let inSync = 0, drifted = 0;

    for (const s of all) {
      if (isMine(s.name, s.class)) mine++;
      else if (s.class === "Bundle") bundle++;
      else if (s.class === "ToolBuiltin") builtin++;
      else if (s.class === "Unknown") unknown++;

      const row = (drift.data?.[s.name] ?? {}) as Partial<Record<string, DriftStatus>>;
      const statuses = Object.values(row).filter(Boolean) as DriftStatus[];
      if (statuses.length > 0 && statuses.every((x) => x === "in-sync")) inSync++;
      else if (statuses.some((x) => x === "drifted-target-newer" || x === "drifted-source-newer")) drifted++;
    }
    return { total: all.length, mine, bundle, builtin, unknown, inSync, drifted };
  }, [skills.data, ownership.data, drift.data]);

  const sparkline = useMemo(() => bucketArchivesByDay(archiveEntries), [archiveEntries]);
  const archivedThisWeek = sparkline.reduce((a, b) => a + b, 0);

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint mb-3">
          {c.libraryCrumb((settings?.source_root ?? "~/.claude/skills").replace(/^.*\/Users\/[^/]+/, "~"))}
        </div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl text-foreground">{c.libraryTitle}</h1>
            <div className="font-mono text-xs text-fg-dim mt-1.5">
              {c.librarySubhead(
                counts.total,
                settings?.enabled_targets?.length ?? 0,
                mode === "simple" ? counts.drifted + counts.unknown : counts.drifted,
                "—",
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {mode === "simple" && (
              <button
                type="button"
                onClick={() => setNewSkillOpen(true)}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-transparent text-foreground text-[12.5px] hover:bg-bg-hover"
              >
                + New skill
              </button>
            )}
            <button
              onClick={() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })}
              disabled={planMut.isPending}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-transparent text-foreground text-[12.5px] hover:bg-bg-hover"
            >
              Preview <Kbd>⌘</Kbd><Kbd>P</Kbd>
            </button>
            <button
              onClick={() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })}
              disabled={planMut.isPending}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-primary text-primary-foreground border border-primary text-[12.5px] font-medium hover:brightness-105 shadow-[0_8px_24px_-8px_var(--accent-glow)]"
            >
              {planMut.isPending ? "Drafting…" : "Sync mine"} <Kbd className="!bg-transparent !border-black/15 !text-black/55">↵</Kbd>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 border border-border rounded-lg overflow-hidden bg-card">
          <Stat k="In sync"  v={counts.inSync}    d={`across ${settings?.enabled_targets?.length ?? 0} targets`} />
          <Stat k="Drift"    v={counts.drifted}   d={counts.drifted ? "needs attention" : "none"} tone={counts.drifted ? "warn" : undefined} />
          <Stat k="Unknown"  v={counts.unknown}   d={counts.unknown ? "needs ownership tag" : "—"} tone={counts.unknown ? "bad" : undefined} />
          <Stat
            k="Archived this week"
            v={archivedThisWeek}
            extra={<Sparkline values={sparkline} hotIndex={sparkline.findIndex((x) => x > 0)} />}
          />
        </div>

        <div className="mt-5 mb-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-card border border-border rounded-md">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setOwnershipFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded font-mono text-[11px] text-muted-foreground transition-colors",
                  ownershipFilter === f.id ? "bg-bg-hover text-foreground ring-1 ring-border-strong" : "hover:text-foreground"
                )}
              >
                {f.label}
                <span className={cn("ml-2", ownershipFilter === f.id ? "text-primary" : "text-fg-faint")}>
                  {countFor(f.id, counts)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-2 px-3 h-8 border border-border bg-card rounded-md min-w-[280px] text-muted-foreground">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/>
              <path d="M11 11l3 3"/>
            </svg>
            <input
              ref={searchRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter skills · regex with /…/"
              className="flex-1 bg-transparent border-0 outline-none text-foreground text-[12.5px] placeholder:text-fg-dim"
            />
            <Kbd>/</Kbd>
          </div>
        </div>
      </div>

      {mode === "simple" && orphans.length > 0 && (
        <section className="px-8 mb-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              {orphans.length} skill{orphans.length === 1 ? "" : "s"} in your tools isn't in your source
            </h2>
            {orphans.map((o) => (
              <OrphanRow
                key={o.name}
                orphan={o}
                onClaim={() => claim(o)}
                onRemove={(t) => removeFromTarget(o.name, t)}
              />
            ))}
          </div>
        </section>
      )}

      <LibraryTable filter={filter} ownershipFilter={ownershipFilter} />

      <SyncPreviewDialog plan={plan} open={!!plan} onOpenChange={(v) => !v && setPlan(null)} />
      <SkillDetailDrawer />
    </div>
  );
}

function countFor(f: OwnershipFilter, c: { total: number; mine: number; bundle: number; builtin: number; unknown: number; drifted: number }) {
  switch (f) {
    case "all":         return c.total;
    case "mine":        return c.mine;
    case "bundle":      return c.bundle;
    case "builtin":     return c.builtin;
    case "unknown":     return c.unknown;
    case "out-of-sync": return c.drifted;
    case "orphan":      return 0;
  }
}

function Stat({ k, v, d, extra, tone }: { k: string; v: number; d?: string; extra?: React.ReactNode; tone?: "warn" | "bad" }) {
  return (
    <div className="px-4 py-3 border-r border-border last:border-r-0">
      <div className="eyebrow">{k}</div>
      <div className={cn(
        "mt-1.5 font-display text-2xl tabular-nums leading-none",
        tone === "warn" ? "text-warning" : tone === "bad" ? "text-destructive" : "text-foreground"
      )}>
        {String(v).padStart(2, "0")}
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
        {d}
        {extra}
      </div>
    </div>
  );
}
