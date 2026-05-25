import { Dialog, DialogContent } from "@/components/ui/dialog";
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

  const decide = (name: string, klass: OwnershipClass) => set.mutate({ name, klass });
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDismissed(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl bg-card border border-border p-0">
        <header className="px-8 py-7 border-b border-border">
          <div className="eyebrow mb-3">·  Acquisitions desk  ·</div>
          <h2
            className="font-display text-[28px] leading-tight tracking-tight"
            style={{ fontVariationSettings: '"SOFT" 50, "opsz" 144' }}
          >
            <span className="italic font-light">{unknowns.length}</span> {unknowns.length === 1 ? "entry" : "entries"}
            <br />
            <span className="italic font-light">await</span> attribution.
          </h2>
          <p className="mt-3 font-body italic text-[14px] text-muted-foreground">
            Confirm authorship so sync only handles what you own.
          </p>
        </header>

        <ul className="max-h-[420px] overflow-auto divide-y divide-border">
          {unknowns.map((s) => (
            <li
              key={s.name}
              className="px-8 py-5 flex items-center justify-between gap-6"
            >
              <div className="min-w-0">
                <div
                  className="font-display text-[20px] leading-tight truncate"
                  style={{ fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
                >
                  {s.name}
                </div>
                {s.description && (
                  <div className="mt-1 font-body italic text-[13px] text-muted-foreground line-clamp-1">
                    {s.description}
                  </div>
                )}
              </div>
              <div className="inline-flex border border-border divide-x divide-border shrink-0">
                <button
                  onClick={() => decide(s.name, "external")}
                  className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  External
                </button>
                <button
                  onClick={() => decide(s.name, "mine")}
                  className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Mine
                </button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
