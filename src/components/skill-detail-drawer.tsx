import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { usePullBack } from "@/hooks/use-sync";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { DriftStatus, LocationView } from "@/types/bindings";

const PRETTY_TARGET: Record<string, string> = {
  claude: "Claude Code",
  codex:  "Codex",
  cursor: "Cursor",
  cowork: "Cowork (zip)",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
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
  if (!skill) return <Sheet open={false} onOpenChange={(v) => !v && close(null)}><SheetContent side="right" /></Sheet>;

  const confirmed = ownership.data?.skills?.[skill.name]?.class === "mine";
  const driftRow = (drift.data?.[skill.name] ?? {}) as Partial<Record<string, DriftStatus>>;
  const primaryLoc: LocationView | undefined = skill.locations[0];

  return (
    <Sheet open={!!selected} onOpenChange={(v) => !v && close(null)}>
      <SheetContent side="right" className="overflow-y-auto p-0">
        <SheetTitle className="sr-only">{skill.name}</SheetTitle>
        <div className="px-6 py-5 border-b border-border">
          <div className="eyebrow mb-2">Skill detail</div>
          <h2 className="font-display text-xl text-foreground leading-tight">{skill.name}</h2>
          <div className="mt-1 font-mono text-[11.5px] text-fg-dim truncate" title={primaryLoc?.path}>
            {primaryLoc?.path.replace(/^.*\/Users\/[^/]+/, "~") ?? "—"}
          </div>
        </div>

        <div className="px-6 py-5">
          <SectionLabel>Meta</SectionLabel>
          <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 font-mono text-[12px]">
            <dt className="text-fg-dim">class</dt>
            <dd className="text-foreground"><OwnerBadge klass={skill.class} confirmed={confirmed} /></dd>
            <dt className="text-fg-dim">locations</dt>
            <dd className="text-foreground">{skill.locations.length}</dd>
            <dt className="text-fg-dim">hash</dt>
            <dd className="text-foreground">{primaryLoc?.hash.slice(0, 12) ?? "—"}</dd>
            <dt className="text-fg-dim">symlink</dt>
            <dd className="text-foreground">{primaryLoc?.is_symlink ? "yes" : "no"}</dd>
          </dl>

          <SectionLabel>Targets</SectionLabel>
          <ul className="space-y-2">
            {(["claude", "codex", "cursor", "cowork"] as const).map((t) => {
              const status = t === "cowork" ? undefined : driftRow[t];
              return (
                <li key={t} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 border border-border rounded-md bg-card">
                  <div className="text-sm">{PRETTY_TARGET[t]}</div>
                  <div>{status ? <DriftBadge status={status} /> : <span className="font-mono text-[10.5px] text-fg-dim">—</span>}</div>
                  <div className="flex gap-1.5">
                    {status === "drifted-target-newer" && (
                      <button
                        onClick={() => pullBack.mutate({ skill: skill.name, target: t })}
                        className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:bg-bg-hover"
                      >
                        pull
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <SectionLabel>Archive</SectionLabel>
          <div className="font-mono text-[11.5px] text-muted-foreground leading-relaxed">
            Overwrites are archived to <span className="text-foreground">~/.Trash/skill-sync-archive/&lt;ts&gt;/</span> before write. Recoverable via Finder.
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => primaryLoc && revealItemInDir(primaryLoc.path).catch(() => {})}
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover"
            >
              Reveal in Finder
            </button>
            <button
              disabled
              title="Packaging not yet wired"
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground opacity-50 cursor-not-allowed"
            >
              Build .skill
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
