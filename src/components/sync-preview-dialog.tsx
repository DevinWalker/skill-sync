import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SyncPlan, PlanAction } from "@/types/bindings";
import { useExecuteSync } from "@/hooks/use-sync";

const tone: Record<PlanAction, { label: string; cls: string; mark: string }> = {
  Create: { label: "Create", cls: "text-success",          mark: "+" },
  Update: { label: "Update", cls: "text-warning",          mark: "≈" },
  Skip:   { label: "Skip",   cls: "text-muted-foreground", mark: "·" },
  Refuse: { label: "Refuse", cls: "text-danger",           mark: "✕" },
};

export function SyncPreviewDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: SyncPlan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const exec = useExecuteSync();
  if (!plan) return null;
  const counts = plan.rows.reduce<Record<PlanAction, number>>(
    (m, r) => ({ ...m, [r.action]: (m[r.action] ?? 0) + 1 }),
    { Create: 0, Update: 0, Skip: 0, Refuse: 0 }
  );
  const hasWork = plan.rows.some((r) => r.action === "Create" || r.action === "Update");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border border-border p-0">
        <header className="px-8 py-7 border-b border-border">
          <div className="eyebrow mb-3">·  Draft of intended actions  ·</div>
          <h2
            className="font-display text-[28px] leading-tight tracking-tight"
            style={{ fontVariationSettings: '"SOFT" 50, "opsz" 144' }}
          >
            Before we touch a thing
          </h2>
          <div className="mt-4 flex gap-6">
            {(Object.entries(counts) as [PlanAction, number][]).map(([k, n]) => (
              <div key={k}>
                <div className={"font-display text-[22px] tracking-tight " + tone[k].cls}>
                  {String(n).padStart(2, "0")}
                </div>
                <div className="eyebrow text-[9px] mt-0.5">{tone[k].label}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="max-h-[420px] overflow-auto">
          <div className="grid grid-cols-[1fr_auto_auto_2fr] gap-x-6 px-8 py-3 border-b border-border">
            <div className="eyebrow">Skill</div>
            <div className="eyebrow">Target</div>
            <div className="eyebrow">Action</div>
            <div className="eyebrow">Note</div>
          </div>
          <ul>
            {plan.rows.map((r, i) => {
              const t = tone[r.action];
              return (
                <li
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto_2fr] gap-x-6 px-8 py-3 border-b border-border/60 last:border-b-0 items-baseline"
                >
                  <span className="font-display text-[15px] truncate">{r.skill}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {r.target}
                  </span>
                  <span className={"inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest " + t.cls}>
                    <span aria-hidden className="text-[12px] leading-none">{t.mark}</span>
                    {t.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {r.reason ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="px-8 py-5 border-t border-border flex items-center justify-between">
          <button
            onClick={() => onOpenChange(false)}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Cancel
          </button>
          <button
            disabled={exec.isPending || !hasWork}
            onClick={() => exec.mutate(plan, { onSuccess: () => onOpenChange(false) })}
            className="inline-flex items-center gap-3 border border-primary bg-primary text-primary-foreground px-5 py-2.5 hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest">
              {exec.isPending ? "Applying…" : "Apply"}
            </span>
            <span className="text-[14px] leading-none">→</span>
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
