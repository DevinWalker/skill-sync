import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SyncPlan, PlanAction } from "@/types/bindings";
import { useExecuteSync } from "@/hooks/use-sync";

const tone: Record<PlanAction, string> = {
  Create: "text-success",
  Update: "text-warning",
  Skip: "text-muted-foreground",
  Refuse: "text-danger",
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
  const counts = plan.rows.reduce<Record<string, number>>((m, r) => {
    m[r.action] = (m[r.action] ?? 0) + 1;
    return m;
  }, {});
  const hasWork = plan.rows.some((r) => r.action === "Create" || r.action === "Update");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sync preview</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {Object.entries(counts)
            .map(([k, n]) => `${n} ${k.toLowerCase()}`)
            .join(" · ")}
        </p>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.skill}</TableCell>
                  <TableCell>{r.target}</TableCell>
                  <TableCell className={tone[r.action]}>{r.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.reason ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={exec.isPending || !hasWork}
            onClick={() =>
              exec.mutate(plan, { onSuccess: () => onOpenChange(false) })
            }
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
