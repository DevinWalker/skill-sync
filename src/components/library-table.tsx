import { useMemo, useState } from "react";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { useUIState } from "@/store/ui-state";
import { useMode } from "@/hooks/use-mode";
import { OwnerBadge } from "./owner-badge";
import { OwnershipPicker } from "./ownership-picker";
import { DriftBar } from "./drift-bar";
import { ToolIconRow } from "./tool-icon-row";
import { friendlyTime } from "@/lib/time";
import type { DriftStatus, OwnershipClass, SkillView } from "@/types/bindings";

interface Props {
  filter?: string;
  ownershipFilter?: "all" | "mine" | "bundle" | "builtin" | "unknown" | "out-of-sync" | "orphan";
}

function firstPath(skill: SkillView): string {
  return String(skill.locations[0]?.path ?? "—").replace(/^.*\/Users\/[^/]+/, "~");
}

function sumFileSize(_skill: SkillView): number {
  // The current SkillView doesn't carry a size field. Estimate from location hash presence
  // and file count proxy; replaced when bindings expose size. For now, return 0.
  return 0;
}

function statusChip(
  skill: SkillView,
  drift: Partial<Record<string, DriftStatus>>,
  enabledTargets: string[],
) {
  if (skill.class === "Unknown")
    return (
      <span className="text-[11px] text-[var(--warning)] border border-[var(--warning)] rounded px-1.5 py-0.5">
        Unknown
      </span>
    );
  const drifted = enabledTargets.filter((t) => {
    const s = drift[t];
    return (
      s === "drifted-source-newer" ||
      s === "drifted-target-newer" ||
      s === "missing-in-target"
    );
  }).length;
  if (drifted === 0)
    return <span className="text-[11px] text-[var(--primary)]">In sync</span>;
  return (
    <span className="text-[11px] text-[var(--warning)]">
      Out of sync · {drifted} {drifted === 1 ? "tool" : "tools"}
    </span>
  );
}

export function LibraryTable({
  filter = "",
  ownershipFilter = "all",
}: Props) {
  const skills = useSkills();
  const { data: ownership } = useOwnership();
  const drift = useDrift();
  const { data: settings } = useSettings();
  const selectSkill = useUIState((s) => s.selectSkill);
  const selectedSkill = useUIState((s) => s.selectedSkill);
  const mode = useMode();

  const enabledTargets = useMemo(
    () => new Set(settings?.enabled_targets ?? []),
    [settings?.enabled_targets]
  );

  const enabledTargetsArray = useMemo(
    () => settings?.enabled_targets ?? [],
    [settings?.enabled_targets]
  );

  const rows = useMemo(() => {
    const all = skills.data ?? [];
    const f = filter.trim().toLowerCase();
    const regex = /^\/(.+)\/$/.exec(filter);
    const matcher = (s: SkillView) => {
      if (!f) return true;
      if (regex) {
        try { return new RegExp(regex[1], "i").test(s.name); } catch { return false; }
      }
      return s.name.toLowerCase().includes(f);
    };
    const ownershipMatches = (s: SkillView) => {
      const confirmed = ownership?.skills?.[s.name]?.class === "mine";
      switch (ownershipFilter) {
        case "all":     return true;
        case "mine":    return s.class === "MineHeuristic" || confirmed;
        case "bundle":  return s.class === "Bundle";
        case "builtin": return s.class === "ToolBuiltin";
        case "unknown": return s.class === "Unknown";
        case "out-of-sync": {
          const row = drift.data?.[s.name];
          if (!row) return false;
          return Object.values(row).some((d) =>
            d === "drifted-source-newer" || d === "drifted-target-newer" || d === "missing-in-target"
          );
        }
        case "orphan": return false; // orphans render in their own section (Task 4.5)
      }
    };
    return all.filter((s) => matcher(s) && ownershipMatches(s));
  }, [skills.data, filter, ownershipFilter, ownership]);

  if (skills.isLoading) {
    return <div className="px-8 py-12 eyebrow">Scanning…</div>;
  }
  if (skills.error) {
    return <div className="px-8 py-12 font-mono text-xs text-destructive">{String(skills.error)}</div>;
  }

  const isSimple = mode === "simple";

  return (
    <div className="px-8 pb-12">
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        {isSimple ? (
          <div className="grid grid-cols-[1fr_180px_220px_120px_140px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">Skill</div>
            <div className="eyebrow">Status</div>
            <div className="eyebrow">Where it lives</div>
            <div className="eyebrow">Updated</div>
            <div className="eyebrow"></div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_140px_220px_120px_80px_140px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">Skill</div>
            <div className="eyebrow">Owner</div>
            <div className="eyebrow">Targets</div>
            <div className="eyebrow">Updated</div>
            <div className="eyebrow text-right">Size</div>
            <div className="eyebrow"></div>
          </div>
        )}
        <ul>
          {rows.map((s, i) => {
            const ownershipEntry = ownership?.skills?.[s.name];
            const confirmed = ownershipEntry?.class === "mine";
            const driftRow = (drift.data?.[s.name] ?? {}) as Partial<Record<string, DriftStatus>>;
            const isSelected = selectedSkill === s.name;
            return (
              <SkillRow
                key={s.name}
                index={i}
                skill={s}
                confirmed={confirmed}
                currentOwnership={ownershipEntry?.class}
                drift={driftRow}
                enabled={enabledTargets}
                enabledTargets={enabledTargetsArray}
                isSelected={isSelected}
                mode={mode}
                onSelect={() => selectSkill(s.name)}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SkillRow({
  index,
  skill,
  confirmed,
  currentOwnership,
  drift,
  enabled,
  enabledTargets,
  isSelected,
  mode,
  onSelect,
}: {
  index: number;
  skill: SkillView;
  confirmed: boolean;
  currentOwnership: OwnershipClass | undefined;
  drift: Partial<Record<string, DriftStatus>>;
  enabled: Set<string>;
  enabledTargets: string[];
  isSelected: boolean;
  mode: "simple" | "pro";
  onSelect: () => void;
}) {
  const [classifyOpen, setClassifyOpen] = useState(false);
  const isUnknown = skill.class === "Unknown";
  const sizeKb = (sumFileSize(skill) / 1024).toFixed(1);

  const actionCell = (
    <div
      data-open={classifyOpen}
      className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 data-[open=true]:opacity-100 transition-opacity"
    >
      {isUnknown ? (
        <button
          className="font-mono text-[10.5px] px-2 py-1 rounded border border-primary bg-primary text-primary-foreground"
          onClick={(e) => { e.stopPropagation(); setClassifyOpen((v) => !v); }}
        >
          {classifyOpen ? "close" : "classify"}
        </button>
      ) : (
        <button
          className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          open
        </button>
      )}
    </div>
  );

  const skillCell = (
    <div className="min-w-0">
      <div className="text-foreground font-medium text-sm truncate">{skill.name}</div>
      <div className="font-mono text-[11px] text-fg-faint truncate">
        {firstPath(skill)} · {skill.locations.length} location{skill.locations.length === 1 ? "" : "s"}
      </div>
    </div>
  );

  return (
    <li
      className="border-b border-border last:border-b-0 console-rise"
      style={{ animationDelay: `${Math.min(index * 28, 720)}ms` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
        className={
          mode === "simple"
            ? "grid grid-cols-[1fr_180px_220px_120px_140px] gap-x-3 items-center px-3.5 py-3 cursor-pointer hover:bg-bg-hover focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-primary transition-colors group"
            : "grid grid-cols-[1fr_140px_220px_120px_80px_140px] gap-x-3 items-center px-3.5 py-3 cursor-pointer hover:bg-bg-hover focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-primary transition-colors group"
        }
        style={isSelected ? { boxShadow: "inset 2px 0 0 var(--primary)" } : undefined}
      >
        {mode === "simple" ? (
          <>
            {skillCell}
            <div>{statusChip(skill, drift, enabledTargets)}</div>
            <div>
              <ToolIconRow
                tools={enabledTargets}
                perTarget={drift as Record<string, DriftStatus | undefined>}
              />
            </div>
            <div className="font-mono text-[11.5px] text-muted-foreground">
              {friendlyTime(null)}
            </div>
            {actionCell}
          </>
        ) : (
          <>
            {skillCell}
            <div>
              <OwnerBadge klass={skill.class} confirmed={confirmed} />
            </div>
            <div>
              <DriftBar
                byTarget={drift as Partial<Record<"claude" | "codex" | "cursor" | "cowork", DriftStatus | undefined>>}
                enabled={enabled}
              />
            </div>
            <div className="font-mono text-[11.5px] text-muted-foreground">—</div>
            <div className="font-mono text-[11.5px] text-fg-dim text-right">{sizeKb} kB</div>
            {actionCell}
          </>
        )}
      </div>
      {classifyOpen && (
        <div className="px-3.5 pb-3">
          <OwnershipPicker
            name={skill.name}
            current={currentOwnership}
          />
        </div>
      )}
    </li>
  );
}
