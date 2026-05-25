import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership, useSetOwnership } from "@/hooks/use-ownership";
import type { OwnershipClass } from "@/types/bindings";

export function OwnershipInbox() {
  const skills = useSkills();
  const ownership = useOwnership();
  const set = useSetOwnership();
  const unknowns = (skills.data ?? []).filter(
    (s) => s.class === "MineHeuristic" && !ownership.data?.skills?.[s.name]
  );
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissed && unknowns.length > 0) setOpen(true);
  }, [unknowns.length, dismissed]);

  if (!unknowns.length) return null;

  const decide = (name: string, klass: OwnershipClass) =>
    set.mutate({ name, klass });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDismissed(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tag your skills</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          {unknowns.length} skill{unknowns.length === 1 ? "" : "s"} look like yours.
          Confirm so sync only touches what you own.
        </p>
        <ul className="space-y-2 max-h-80 overflow-auto">
          {unknowns.map((s) => (
            <li
              key={s.name}
              className="flex items-center justify-between rounded border border-border p-3"
            >
              <div>
                <div className="text-sm">{s.name}</div>
                {s.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {s.description}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decide(s.name, "external")}
                >
                  External
                </Button>
                <Button size="sm" onClick={() => decide(s.name, "mine")}>
                  Mine
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
