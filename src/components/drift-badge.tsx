import { cn } from "@/lib/utils";
import type { DriftStatus } from "@/types/bindings";

const TONE: Record<DriftStatus, { label: string; tone: string }> = {
  "in-sync":              { label: "in sync",          tone: "text-primary" },
  "drifted-target-newer": { label: "drift · target",   tone: "text-warning" },
  "drifted-source-newer": { label: "drift · source",   tone: "text-warning" },
  "missing-in-target":    { label: "absent",           tone: "text-fg-dim" },
  "unmanaged":            { label: "linked",           tone: "text-fg-dim" },
  "refused":              { label: "refused",          tone: "text-destructive" },
};

export function DriftBadge({ status }: { status: DriftStatus }) {
  const c = TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.04em]", c.tone)}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}
