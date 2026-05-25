import type { Class } from "@/types/bindings";

const config: Record<Class, { label: string; tone: string }> = {
  MineHeuristic: { label: "Mine (auto)", tone: "bg-warning/15 text-warning" },
  Bundle:        { label: "Bundle",      tone: "bg-muted text-muted-foreground" },
  ToolBuiltin:   { label: "Built-in",    tone: "bg-muted text-muted-foreground" },
  Unknown:       { label: "Unknown",     tone: "bg-danger/15 text-danger" },
};

export function OwnerBadge({ klass, confirmed }: { klass: Class; confirmed?: boolean }) {
  const c =
    confirmed && klass === "MineHeuristic"
      ? { label: "Mine", tone: "bg-success/15 text-success" }
      : config[klass];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${c.tone}`}>
      {c.label}
    </span>
  );
}
