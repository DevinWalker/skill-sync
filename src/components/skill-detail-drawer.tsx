import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { OwnershipPicker } from "./ownership-picker";
import { DriftBadge } from "./drift-badge";

export function SkillDetailDrawer() {
  const selected = useUIState((s) => s.selectedSkill);
  const close = useUIState((s) => s.selectSkill);
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const skill = skills.data?.find((s) => s.name === selected) ?? null;
  return (
    <Sheet open={!!selected} onOpenChange={(v) => !v && close(null)}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        {skill && (
          <>
            <SheetHeader>
              <SheetTitle>{skill.name}</SheetTitle>
            </SheetHeader>
            {skill.description && (
              <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
            )}

            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Ownership
              </h3>
              <OwnershipPicker
                name={skill.name}
                current={ownership.data?.skills?.[skill.name]?.class}
              />
            </section>

            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Locations
              </h3>
              <ul className="space-y-2">
                {skill.locations.map((l) => (
                  <li key={String(l.path)} className="text-xs">
                    <div className="mono break-all">{String(l.path)}</div>
                    <div className="text-muted-foreground">
                      hash: <span className="mono">{l.hash.slice(0, 12)}</span>
                      {l.is_symlink ? " · symlink" : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Targets
              </h3>
              <ul className="space-y-1.5">
                {Object.entries(drift.data?.[skill.name] ?? {}).map(([target, status]) => (
                  <li key={target} className="flex justify-between text-sm">
                    <span className="capitalize">{target}</span>
                    <DriftBadge status={status} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
