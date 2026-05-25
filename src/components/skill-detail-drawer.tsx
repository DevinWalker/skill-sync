import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { usePullBack } from "@/hooks/use-sync";
import { OwnershipPicker } from "./ownership-picker";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";
import { ipc } from "@/lib/ipc";

function EyebrowRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="eyebrow whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

export function SkillDetailDrawer() {
  const selected = useUIState((s) => s.selectedSkill);
  const close = useUIState((s) => s.selectSkill);
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const pullBack = usePullBack();
  const skill = skills.data?.find((s) => s.name === selected) ?? null;
  const confirmed = !!skill && ownership.data?.skills?.[skill.name]?.class === "mine";

  return (
    <Sheet open={!!selected} onOpenChange={(v) => !v && close(null)}>
      <SheetContent
        side="right"
        className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-card p-0 border-l border-border"
      >
        {skill && (
          <article className="px-9 py-10">
            {/* Eyebrow */}
            <div className="flex items-baseline justify-between mb-6">
              <div className="eyebrow">·  Specimen Card  ·</div>
              <OwnerBadge klass={skill.class} confirmed={confirmed} />
            </div>

            {/* Title */}
            <h2
              className="font-display text-[40px] leading-[1.02] tracking-tight"
              style={{ fontVariationSettings: '"SOFT" 50, "opsz" 144' }}
            >
              {skill.name}
            </h2>
            {skill.description && (
              <p className="mt-3 font-body italic text-[15px] text-muted-foreground leading-snug">
                {skill.description}
              </p>
            )}

            {/* Rule */}
            <div className="h-px bg-foreground/30 my-7" />

            {/* Provenance */}
            <section className="mb-8">
              <EyebrowRule>I.  Provenance</EyebrowRule>
              <OwnershipPicker
                name={skill.name}
                current={ownership.data?.skills?.[skill.name]?.class}
              />
            </section>

            {/* Locations */}
            <section className="mb-8">
              <EyebrowRule>II.  Locations on record</EyebrowRule>
              <ol className="space-y-3">
                {skill.locations.map((l, i) => (
                  <li key={String(l.path)} className="flex gap-4">
                    <span className="font-mono text-[10px] text-muted-foreground/60 pt-0.5 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12px] break-all leading-snug">
                        {String(l.path)}
                      </div>
                      <div className="mt-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span>hash {l.hash.slice(0, 10)}</span>
                        {l.is_symlink && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>symbolic link</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Targets */}
            <section className="mb-8">
              <EyebrowRule>III.  Custody across targets</EyebrowRule>
              <ul className="divide-y divide-border">
                {Object.entries(drift.data?.[skill.name] ?? {}).map(([target, status]) => (
                  <li key={target} className="py-2.5 flex items-center justify-between">
                    <span className="font-display text-[17px] capitalize">{target}</span>
                    <div className="flex items-center gap-4">
                      <DriftBadge status={status} />
                      {status === "drifted-target-newer" && (
                        <button
                          className="font-mono text-[10px] uppercase tracking-widest underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground hover:text-foreground text-muted-foreground transition-colors"
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

            {/* Actions */}
            <section>
              <EyebrowRule>IV.  Acts of preservation</EyebrowRule>
              <button
                onClick={async () => {
                  try {
                    const p = await ipc.buildPackage(skill.name);
                    alert(`Built: ${p}`);
                  } catch (e) {
                    alert(`Failed: ${String(e)}`);
                  }
                }}
                className="inline-flex items-center gap-3 border border-foreground/30 hover:border-primary hover:text-primary px-4 py-2 transition-colors"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest">Build .skill</span>
                <span className="text-[12px] leading-none">↓</span>
              </button>
            </section>
          </article>
        )}
      </SheetContent>
    </Sheet>
  );
}
