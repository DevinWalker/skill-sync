import type { LocationView, SkillView } from "@/types/bindings";

function inferTarget(path: string): string | null {
  if (path.includes("/.claude/skills/"))  return "claude";
  if (path.includes("/.codex/skills/"))   return "codex";
  if (path.includes("/.cursor/skills"))   return "cursor";
  return null;
}

export interface LocationsResult {
  source?: LocationView;
  byTarget: Record<string, LocationView | undefined>;
}

export function locationsByTarget(
  skill: SkillView,
  sourceRoot: string,
): LocationsResult {
  const byTarget: Record<string, LocationView | undefined> = {};
  let source: LocationView | undefined;
  for (const loc of skill.locations) {
    const p = String(loc.path);
    if (sourceRoot && p.startsWith(sourceRoot)) {
      if (!source) source = loc;
      continue;
    }
    const t = inferTarget(p);
    if (t && !byTarget[t]) byTarget[t] = loc;
  }
  if (!source) source = skill.locations[0];
  return { source, byTarget };
}
