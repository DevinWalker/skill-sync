import { TargetCard } from "@/components/target-card";
import { useSettings } from "@/hooks/use-settings";
import { useMode } from "@/hooks/use-mode";
import { useCopy } from "@/hooks/use-copy";

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  cowork: "Cowork (zip)",
};

export function TargetsPage() {
  const { data: settings } = useSettings();
  const mode = useMode();
  const c = useCopy();
  const home = settings?.source_root
    ? String(settings.source_root).replace(/\/\.claude\/skills\/?$/, "")
    : "";

  const allCards = [
    { name: "claude", path: home ? `${home}/.claude/skills` : undefined, kind: "directory-mirror" as const },
    { name: "codex",  path: home ? `${home}/.codex/skills`  : undefined, kind: "directory-mirror" as const },
    { name: "cursor", path: home ? `${home}/.cursor/skills` : undefined, kind: "directory-mirror" as const },
    { name: "cowork", path: undefined, kind: "package-only" as const },
  ];
  const cards = mode === "simple"
    ? allCards.filter((t) => t.name !== "cowork")
    : allCards;
  const enabledCount = settings?.enabled_targets?.length ?? 0;

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint mb-3">
          {c.targetsCrumb}
        </div>
        <h1 className="font-display text-2xl">{c.targetsTitle}</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          {mode === "simple"
            ? cards.map((t) => TOOL_LABELS[t.name] ?? t.name).join(" · ")
            : (
              <>
                <span className="text-foreground">{cards.length}</span> cabinets ·{" "}
                <span className="text-foreground">{enabledCount}</span> enabled · 3 directory mirrors · 1 package
              </>
            )}
        </div>
      </div>
      <div className="px-8 mt-6 pb-12 grid grid-cols-2 gap-4">
        {cards.map((t) => <TargetCard key={t.name} {...t} />)}
      </div>
    </div>
  );
}
