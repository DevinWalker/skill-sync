import type { DriftStatus } from "@/types/bindings";

const config: Record<DriftStatus, { label: string; tone: string }> = {
  "in-sync":              { label: "in sync",   tone: "text-success" },
  "drifted-target-newer": { label: "drifted ↑", tone: "text-warning" },
  "drifted-source-newer": { label: "drifted ↓", tone: "text-warning" },
  "missing-in-target":    { label: "missing",   tone: "text-muted-foreground" },
  "unmanaged":            { label: "symlinked", tone: "text-muted-foreground" },
  "refused":              { label: "refused",   tone: "text-danger" },
};

export function DriftBadge({ status }: { status: DriftStatus }) {
  return <span className={`text-xs ${config[status].tone}`}>{config[status].label}</span>;
}
