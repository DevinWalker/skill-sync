import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LibraryTable } from "@/components/library-table";
import { OwnershipInbox } from "@/components/ownership-inbox";
import { SyncPreviewDialog } from "@/components/sync-preview-dialog";
import { usePlanSync } from "@/hooks/use-sync";
import type { SyncPlan } from "@/types/bindings";

export function LibraryPage() {
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const planMut = usePlanSync();
  return (
    <div className="py-6">
      <header className="px-8 pb-4 flex items-center justify-between">
        <h1 className="text-lg">Library</h1>
        <Button
          onClick={() =>
            planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })
          }
          disabled={planMut.isPending}
        >
          {planMut.isPending ? "Planning…" : "Sync mine"}
        </Button>
      </header>
      <LibraryTable />
      <OwnershipInbox />
      <SyncPreviewDialog
        plan={plan}
        open={!!plan}
        onOpenChange={(v) => !v && setPlan(null)}
      />
    </div>
  );
}
