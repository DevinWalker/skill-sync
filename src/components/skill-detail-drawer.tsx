import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";
import { CompareDialog } from "./compare-dialog";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { usePullBack, useBuildPackage } from "@/hooks/use-sync";
import { useMode } from "@/hooks/use-mode";
import { useSettings } from "@/hooks/use-settings";
import { locationsByTarget } from "@/lib/target-locations";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { DriftStatus } from "@/types/bindings";

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
  const buildPackage = useBuildPackage();
  const mode = useMode();
  const { data: settings } = useSettings();
  const [compareTarget, setCompareTarget] = useState<string | null>(null);
  const skill = skills.data?.find((s) => s.name === selected) ?? null;
  const { source: sourceLoc, byTarget } = useMemo(
    () => skill ? locationsByTarget(skill, settings?.source_root ?? "") : { source: undefined, byTarget: {} },
    [skill, settings?.source_root],
  );
  if (!skill) return <Sheet open={false} onOpenChange={(v) => !v && close(null)}><SheetContent side="right" /></Sheet>;

  const confirmed = ownership.data?.skills?.[skill.name]?.class === "mine";
  const driftRow = (drift.data?.[skill.name] ?? {}) as Partial<Record<string, DriftStatus>>;
  const primaryLoc = sourceLoc;

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
            {mode === "pro" && <dt className="text-fg-dim">hash</dt>}
            {mode === "pro" && <dd className="text-foreground">{primaryLoc?.hash.slice(0, 12) ?? "—"}</dd>}
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
                    {mode === "simple" && (status === "drifted-target-newer" || status === "drifted-source-newer") && (
                      <button
                        onClick={() => setCompareTarget(t)}
                        className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:bg-bg-hover"
                      >
                        compare
                      </button>
                    )}
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
            {mode === "pro" && (
              <button
                onClick={() => buildPackage.mutate(skill.name)}
                disabled={buildPackage.isPending}
                className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
              >
                {buildPackage.isPending ? "Building…" : "Build .skill"}
              </button>
            )}
          </div>
        </div>

        {compareTarget && (
          <CompareDialog
            open={!!compareTarget}
            onClose={() => setCompareTarget(null)}
            skillName={skill.name}
            tool={compareTarget}
            yourPath={String(sourceLoc?.path ?? "")}
            yourUpdated={sourceLoc?.modified_at ?? ""}
            theirPath={String(byTarget[compareTarget]?.path ?? "")}
            theirUpdated={byTarget[compareTarget]?.modified_at ?? ""}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
