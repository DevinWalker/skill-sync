import { TargetCard } from "@/components/target-card";
import { useSettings } from "@/hooks/use-settings";

export function TargetsPage() {
  const { data: settings } = useSettings();
  const home = settings?.source_root
    ? String(settings.source_root).replace(/\/\.claude\/skills\/?$/, "")
    : "";

  const cards = [
    { name: "claude", path: home ? `${home}/.claude/skills` : undefined, kind: "directory-mirror" as const },
    { name: "codex",  path: home ? `${home}/.codex/skills`  : undefined, kind: "directory-mirror" as const },
    { name: "cursor", path: home ? `${home}/.cursor/skills` : undefined, kind: "directory-mirror" as const },
    { name: "cowork", path: undefined, kind: "package-only" as const },
  ];
  const enabledCount = settings?.enabled_targets?.length ?? 0;

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">targets</span>
        </div>
        <h1 className="font-display text-2xl">Targets</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          <span className="text-foreground">{cards.length}</span> cabinets ·{" "}
          <span className="text-foreground">{enabledCount}</span> enabled · 3 directory mirrors · 1 package
        </div>
      </div>
      <div className="px-8 mt-6 pb-12 grid grid-cols-2 gap-4">
        {cards.map((t) => <TargetCard key={t.name} {...t} />)}
      </div>
    </div>
  );
}
