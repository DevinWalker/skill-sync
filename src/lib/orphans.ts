import type { DriftStatus, SkillView } from "@/types/bindings";

export type Orphan = {
  name: string;
  tools: string[]; // target names where the skill was found
};

export function deriveOrphans(
  skills: SkillView[],
  drift: Record<string, Record<string, DriftStatus>>,
): Orphan[] {
  const known = new Set(skills.map((s) => s.name));
  const orphans: Orphan[] = [];
  for (const [name, perTarget] of Object.entries(drift)) {
    if (known.has(name)) continue;
    const tools: string[] = [];
    for (const [target, status] of Object.entries(perTarget)) {
      if (status !== "missing-in-target" && status !== "refused") tools.push(target);
    }
    if (tools.length > 0) orphans.push({ name, tools });
  }
  return orphans;
}
