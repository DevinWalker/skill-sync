import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCopy } from "@/hooks/use-copy";
import { useSkills } from "@/hooks/use-skills";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { usePlanSync } from "@/hooks/use-sync";
import { useAudit } from "@/hooks/use-audit";
import { SyncPreviewDialog } from "@/components/sync-preview-dialog";
import { NeedsAttentionCard } from "@/components/needs-attention-card";
import { deriveOrphans } from "@/lib/orphans";
import { activitySentence } from "@/lib/activity-sentence";
import type { DriftStatus, SkillView, SyncPlan } from "@/types/bindings";

function classify(
  skills: SkillView[],
  drift: Record<string, Record<string, DriftStatus>>,
  enabledTargets: string[],
) {
  let inSync = 0;
  let outOfSync = 0;
  let orphans = 0;
  let unknown = 0;
  for (const s of skills) {
    if (s.class === "Unknown") {
      unknown++;
      continue;
    }
    const perTarget = drift[s.name] ?? {};
    const statuses = enabledTargets.map((t) => perTarget[t] ?? "missing-in-target");
    if (statuses.every((d) => d === "in-sync")) inSync++;
    else if (statuses.some((d) => d === "drifted-target-newer" || d === "drifted-source-newer"))
      outOfSync++;
    else if (statuses.some((d) => d === "missing-in-target")) {
      outOfSync++;
    }
  }
  // Orphans = skills present in any target's drift table that don't have a SkillView entry.
  // Implementation lands in Task 2.4; placeholder zero here.
  return { inSync, outOfSync, orphans, unknown };
}

export function HomePage() {
  const c = useCopy();
  const nav = useNavigate();
  const { data: skills = [] } = useSkills();
  const { data: drift = {} } = useDrift();
  const { data: settings } = useSettings();
  const targets = settings?.enabled_targets ?? [];
  const orphans = useMemo(() => deriveOrphans(skills, drift), [skills, drift]);
  const { data: audit = [] } = useAudit(50);
  const recent = audit.slice(0, 3);
  const counts = useMemo(() => {
    const c = classify(skills, drift, targets);
    return { ...c, orphans: orphans.length };
  }, [skills, drift, targets, orphans]);
  const planMut = usePlanSync();
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [, setNewSkillOpen] = useState(false);

  return (
    <main className="px-8 pt-7 pb-20">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
            {c.homeCrumb}
          </p>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
            {counts.outOfSync === 0 && counts.orphans === 0 && counts.unknown === 0
              ? `Your ${skills.length} skills are in sync across ${targets.length} tools.`
              : `${counts.inSync} of your ${skills.length} skills are in sync. ${counts.outOfSync} out of sync, ${counts.orphans} not in your source.`}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--fg-dim)]">
            last scan · source {settings?.source_root ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <button
            type="button"
            onClick={() =>
              planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })
            }
            disabled={planMut.isPending || skills.length === 0}
            className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)] hover:brightness-105 disabled:opacity-50"
          >
            {planMut.isPending ? "Drafting…" : `${c.syncEverythingButton} ↵`}
          </button>
          <button
            type="button"
            onClick={() => setNewSkillOpen(true)}
            className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-[var(--bg-hover)]"
          >
            + New skill
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-4 rounded-lg border border-[var(--border)] bg-[var(--card)] divide-x divide-[var(--border)]">
        <Cell label={c.statusInSync} value={`${counts.inSync} skills`} onClick={() => nav("/library?filter=mine")} />
        <Cell label={c.statusOutOfSync} value={`${counts.outOfSync} skills`} onClick={() => nav("/library?filter=out-of-sync")} />
        <Cell label={c.statusNeedsClaiming} value={`${counts.orphans} skills`} onClick={() => nav("/library?filter=orphan")} />
        <Cell label={c.statusUnknown} value={`${counts.unknown} skills`} onClick={() => nav("/library?filter=unknown")} />
      </div>
      <NeedsAttentionCard orphans={orphans} />

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
          Recent activity
        </h2>
        <ul className="space-y-1.5 text-[13.5px]">
          {recent.map((e, i) => (
            <li key={i} className="text-[var(--muted-foreground)]">
              <span className="font-mono text-[var(--fg-dim)]">
                {new Date(e.ts).toLocaleTimeString()} ·
              </span>{" "}
              {activitySentence(e)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px]">
          <a href="/activity" className="text-[var(--primary)] underline">
            view full history →
          </a>
        </p>
      </section>

      <SyncPreviewDialog plan={plan} open={!!plan} onOpenChange={(v) => !v && setPlan(null)} />
    </main>
  );
}

function Cell({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-5 text-left hover:bg-[var(--bg-hover)] transition-colors"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-[22px] tracking-[-0.01em]">{value}</p>
    </button>
  );
}
