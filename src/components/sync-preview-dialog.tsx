import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useExecuteSync } from "@/hooks/use-sync";
import type { SyncPlan, PlanAction } from "@/types/bindings";

const ACTION_TONE: Record<PlanAction, "primary" | "warning" | "default" | "danger"> = {
  Create: "primary",
  Update: "warning",
  Skip:   "default",
  Refuse: "danger",
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
      <DialogContent className="max-w-3xl p-0">
        <header className="px-5 py-4 border-b border-border">
          <div className="eyebrow">Sync preview · ⌘P</div>
          <div className="mt-3 grid grid-cols-4 gap-4">
            {(Object.keys(counts) as PlanAction[]).map((k) => (
              <div key={k}>
                <div className="font-display text-xl tabular-nums leading-none text-foreground">{String(counts[k]).padStart(2, "0")}</div>
                <div className="mt-1.5"><Badge variant={ACTION_TONE[k]}>{k}</Badge></div>
              </div>
            ))}
          </div>
        </header>

        <div className="max-h-[420px] overflow-auto">
          <div className="grid grid-cols-[1fr_120px_100px_2fr] gap-x-3 px-5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">Skill</div>
            <div className="eyebrow">Target</div>
            <div className="eyebrow">Action</div>
            <div className="eyebrow">Note</div>
          </div>
          <ul>
            {plan.rows.map((r, i) => (
              <li key={i} className="grid grid-cols-[1fr_120px_100px_2fr] gap-x-3 items-center px-5 py-2.5 border-b border-border last:border-b-0">
                <div className="text-sm text-foreground truncate">{r.skill}</div>
                <div className="font-mono text-[11.5px] text-muted-foreground">{r.target}</div>
                <div><Badge variant={ACTION_TONE[r.action]}>{r.action}</Badge></div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{r.reason ?? "—"}</div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button
            disabled={!hasWork || exec.isPending}
            onClick={() => exec.mutate(plan, { onSuccess: () => onOpenChange(false) })}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-primary text-primary-foreground border border-primary text-[12.5px] font-medium hover:brightness-105 disabled:opacity-50"
          >
            {exec.isPending ? "Syncing…" : "Sync now"} <Kbd className="!bg-transparent !border-black/15 !text-black/55">↵</Kbd>
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
