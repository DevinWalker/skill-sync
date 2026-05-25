import { TargetCard } from "@/components/target-card";

const HOME = "/Users/devinwalker"; // M7 Task 29 swaps this to live settings via useSettings()

const CARDS = [
  { name: "claude", path: `${HOME}/.claude/skills`,  kind: "directory-mirror" as const },
  { name: "codex",  path: `${HOME}/.codex/skills`,   kind: "directory-mirror" as const },
  { name: "cursor", path: `${HOME}/.cursor/skills`,  kind: "directory-mirror" as const },
  { name: "cowork", path: undefined,                 kind: "package-only"     as const },
];

export function TargetsPage() {
  return (
    <div className="py-6 px-8 space-y-3">
      <h1 className="text-lg">Targets</h1>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((t) => (
          <TargetCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  );
}
