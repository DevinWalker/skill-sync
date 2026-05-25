import { TargetCard } from "@/components/target-card";
import { useSettings } from "@/hooks/use-settings";

export function TargetsPage() {
  const { data: settings } = useSettings();

  // source_root looks like "$HOME/.claude/skills" by default; strip ".claude/skills" off the end
  const home = settings?.source_root
    ? String(settings.source_root).replace(/\/\.claude\/skills\/?$/, "")
    : "";

  const cards = [
    { name: "claude", path: home ? `${home}/.claude/skills` : undefined, kind: "directory-mirror" as const },
    { name: "codex",  path: home ? `${home}/.codex/skills`  : undefined, kind: "directory-mirror" as const },
    { name: "cursor", path: home ? `${home}/.cursor/skills` : undefined, kind: "directory-mirror" as const },
    { name: "cowork", path: undefined, kind: "package-only" as const },
  ];

  return (
    <div className="py-6 px-8 space-y-3">
      <h1 className="text-lg">Targets</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((t) => (
          <TargetCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  );
}
