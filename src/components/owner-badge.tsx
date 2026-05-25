import type { Class } from "@/types/bindings";

type Config = { label: string; tone: string; mark: string };

const config: Record<Class, Config> = {
  MineHeuristic: { label: "Mine · auto", tone: "text-warning",          mark: "◇" },
  Bundle:        { label: "Bundle",      tone: "text-muted-foreground", mark: "○" },
  ToolBuiltin:   { label: "Built-in",    tone: "text-muted-foreground", mark: "·" },
  Unknown:       { label: "Unknown",     tone: "text-danger",           mark: "?" },
};

const confirmedMine: Config = { label: "Mine", tone: "text-primary", mark: "◆" };

export function OwnerBadge({ klass, confirmed }: { klass: Class; confirmed?: boolean }) {
  const c = confirmed && klass === "MineHeuristic" ? confirmedMine : config[klass];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${c.tone}`}
    >
      <span aria-hidden className="text-[14px] leading-none translate-y-[-1px]">{c.mark}</span>
      {c.label}
    </span>
  );
}
