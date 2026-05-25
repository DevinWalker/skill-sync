import { useMemo, useState } from "react";
import { LibraryTable } from "@/components/library-table";
import { OwnershipInbox } from "@/components/ownership-inbox";
import { SyncPreviewDialog } from "@/components/sync-preview-dialog";
import { SkillDetailDrawer } from "@/components/skill-detail-drawer";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { usePlanSync } from "@/hooks/use-sync";
import { useDriftRefresh } from "@/hooks/use-drift-refresh";
import type { SyncPlan } from "@/types/bindings";

export function LibraryPage() {
  useDriftRefresh();
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const planMut = usePlanSync();

  const stats = useMemo(() => {
    const total = skills.data?.length ?? 0;
    const mine = Object.values(ownership.data?.skills ?? {}).filter((e) => e.class === "mine").length;
    const drifted = Object.values(drift.data ?? {})
      .flatMap((row) => Object.values(row ?? {}))
      .filter((s) => s === "drifted-target-newer" || s === "drifted-source-newer").length;
    return { total, mine, drifted };
  }, [skills.data, ownership.data, drift.data]);

  return (
    <div className="archive-rise">
      <header className="px-12 pt-12 pb-10">
        <div className="flex items-start justify-between gap-12">
          <div>
            <div className="eyebrow mb-5">·  The Library  ·  Folio I</div>
            <h1
              className="font-display text-[64px] leading-[0.95] tracking-[-0.02em] text-foreground"
              style={{ fontVariationSettings: '"SOFT" 80, "opsz" 144' }}
            >
              <span className="italic font-light">A</span> catalogue
              <br />
              of <span className="italic font-light">authored</span> works.
            </h1>
            <p className="mt-6 font-body italic text-[17px] text-muted-foreground max-w-xl leading-snug">
              Skills assembled across {stats.total > 0 ? stats.total : "—"} entries.
              Provenance examined, drift watched, custody honoured.
            </p>
          </div>

          {/* Action column */}
          <div className="shrink-0 flex flex-col items-end gap-3">
            <button
              onClick={() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })}
              disabled={planMut.isPending}
              className="group inline-flex items-center gap-3 border border-primary px-5 py-2.5 text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest">
                {planMut.isPending ? "Drafting…" : "Sync mine"}
              </span>
              <span className="text-[14px] leading-none">→</span>
            </button>
            <div className="grid grid-cols-3 gap-x-6 text-right">
              <Stat label="Entries" value={stats.total} />
              <Stat label="Mine"    value={stats.mine}  />
              <Stat label="Drifted" value={stats.drifted} tone={stats.drifted ? "text-warning" : undefined} />
            </div>
          </div>
        </div>
        <div className="mt-10 h-px bg-foreground/30" />
      </header>

      <LibraryTable />

      <OwnershipInbox />
      <SyncPreviewDialog plan={plan} open={!!plan} onOpenChange={(v) => !v && setPlan(null)} />
      <SkillDetailDrawer />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className={"font-display text-2xl tracking-tight " + (tone ?? "text-foreground")}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="eyebrow text-[9px] mt-0.5">{label}</div>
    </div>
  );
}
