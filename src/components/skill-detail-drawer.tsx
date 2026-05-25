import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { usePullBack } from "@/hooks/use-sync";
import { OwnershipPicker } from "./ownership-picker";
import { DriftBadge } from "./drift-badge";
import { ipc } from "@/lib/ipc";

export function SkillDetailDrawer() {
  const selected = useUIState((s) => s.selectedSkill);
  const close = useUIState((s) => s.selectSkill);
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const pullBack = usePullBack();
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
                  <li key={target} className="flex justify-between items-center text-sm">
                    <span className="capitalize">{target}</span>
                    <div className="flex items-center gap-3">
                      <DriftBadge status={status} />
                      {status === "drifted-target-newer" && (
                        <button
                          className="text-xs underline text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            if (
                              confirm(
                                `Replace your source copy of ${skill.name} with the version from ${target}? The old source goes to Trash.`
                              )
                            ) {
                              pullBack.mutate({ skill: skill.name, target });
                            }
                          }}
                        >
                          Pull back
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <button
                className="text-xs underline text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  try {
                    const p = await ipc.buildPackage(skill.name);
                    alert(`Built: ${p}`);
                  } catch (e) {
                    alert(`Failed: ${String(e)}`);
                  }
                }}
              >
                Build .skill package
              </button>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
