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

  return (
    <div className="console-rise">
      <header className="px-12 pt-12 pb-10">
        <div className="eyebrow mb-5">·  Custody  ·  Folio II</div>
        <h1
          className="font-display text-[64px] leading-[0.95] tracking-[-0.02em]"
          style={{ fontVariationSettings: '"SOFT" 80, "opsz" 144' }}
        >
          The four <span className="italic font-light">cabinets</span>
        </h1>
        <p className="mt-6 font-body italic text-[17px] text-muted-foreground max-w-xl leading-snug">
          Three local mirrors and one bundled archive. Test each before you ask the curator to sync.
        </p>
        <div className="mt-10 h-px bg-foreground/30" />
      </header>

      <div className="px-12 pb-12 grid grid-cols-2 gap-6">
        {cards.map((t) => (
          <TargetCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  );
}
