import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { useUIState } from "@/store/ui-state";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";
import type { DriftStatus, SkillView } from "@/types/bindings";

const TARGETS = ["claude", "codex", "cursor"] as const;
const TARGET_GLYPH: Record<(typeof TARGETS)[number], string> = {
  claude: "CL",
  codex:  "CX",
  cursor: "CR",
};

function entryNumber(i: number) {
  return String(i + 1).padStart(3, "0");
}

function firstLocationPath(skill: SkillView): string {
  return String(skill.locations[0]?.path ?? "—");
}

function firstLocationHash(skill: SkillView): string {
  return skill.locations[0]?.hash?.slice(0, 8) ?? "—";
}

export function LibraryTable() {
  const skills = useSkills();
  const { data: ownership } = useOwnership();
  const drift = useDrift();
  const selectSkill = useUIState((s) => s.selectSkill);

  if (skills.isLoading) {
    return (
      <div className="px-12 py-16 eyebrow text-muted-foreground">Scanning the archive…</div>
    );
  }
  if (skills.error) {
    return (
      <div className="px-12 py-16 text-danger font-mono text-xs">{String(skills.error)}</div>
    );
  }
  if (!skills.data) return null;

  return (
    <div>
      {/* Column header — letterpressed eyebrow row */}
      <div className="grid grid-cols-[3rem_1fr_auto_auto] gap-x-8 px-12 pb-3 border-b border-border">
        <div className="eyebrow">№</div>
        <div className="eyebrow">Entry · Provenance</div>
        <div className="eyebrow text-right">Targets</div>
        <div className="eyebrow text-right pr-1">Hash</div>
      </div>

      <ul>
        {skills.data.map((s, i) => {
          const confirmed = ownership?.skills?.[s.name]?.class === "mine";
          const row = (drift.data?.[s.name] ?? {}) as Partial<Record<string, DriftStatus>>;
          return (
            <li
              key={s.name}
              className="console-rise group border-b border-border last:border-b-0"
              style={{ animationDelay: `${Math.min(i * 28, 360)}ms` }}
            >
              <button
                onClick={() => selectSkill(s.name)}
                className="w-full text-left grid grid-cols-[3rem_1fr_auto_auto] gap-x-8 items-baseline px-12 py-5 transition-colors hover:bg-secondary/50 focus:outline-none focus-visible:bg-secondary/60"
              >
                {/* Index */}
                <div className="font-mono text-[11px] text-muted-foreground/70 pt-2">
                  {entryNumber(i)}
                </div>

                {/* Title + provenance + path */}
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <h3
                      className="font-display text-[24px] leading-tight tracking-tight truncate"
                      style={{ fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
                    >
                      {s.name}
                    </h3>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <OwnerBadge klass={s.class} confirmed={confirmed} />
                    <span className="text-muted-foreground/40 font-mono text-[10px]">·</span>
                    <span className="font-mono text-[11px] text-muted-foreground truncate">
                      {firstLocationPath(s)}
                    </span>
                    {s.locations.length > 1 && (
                      <span className="font-mono text-[10px] text-muted-foreground/70">
                        +{s.locations.length - 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Target glyphs */}
                <div className="flex items-center gap-3">
                  {TARGETS.map((t) => {
                    const status = row[t];
                    return (
                      <div key={t} className="flex flex-col items-center min-w-[44px]">
                        <span
                          className={
                            "font-mono text-[10px] uppercase tracking-widest mb-1.5 " +
                            (status ? "text-foreground" : "text-muted-foreground/40")
                          }
                        >
                          {TARGET_GLYPH[t]}
                        </span>
                        {status ? (
                          <DriftBadge status={status} />
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hash */}
                <div className="text-right pr-1">
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {firstLocationHash(s)}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
