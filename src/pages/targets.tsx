import { TargetCard } from "@/components/target-card";
import { useSettings } from "@/hooks/use-settings";
import { strings } from "@/lib/copy";

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  cowork: "Cowork (zip)",
};

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

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint mb-3">
          {strings.targetsCrumb}
        </div>
        <h1 className="font-display text-2xl">{strings.targetsTitle}</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          {cards.map((t) => TOOL_LABELS[t.name] ?? t.name).join(" · ")}
        </div>
      </div>
      <div className="px-8 mt-6 pb-12 grid grid-cols-2 gap-4">
        {cards.map((t) => <TargetCard key={t.name} {...t} />)}
      </div>
    </div>
  );
}
