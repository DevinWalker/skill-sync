import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { DriftStatus } from "@/types/bindings";

const LANES = ["claude", "codex", "cursor", "cowork"] as const;
type Lane = typeof LANES[number];

interface Props {
  /** Drift status per target. `cowork` is allowed but not required;
   *  if absent it renders as not-installed. */
  byTarget: Partial<Record<Lane, DriftStatus | undefined>>;
  /** Set of enabled target names from settings. Lanes not in this set render dashed. */
  enabled: Set<string>;
  className?: string;
}

function segmentClass(status: DriftStatus | undefined, isEnabled: boolean): string {
  if (!isEnabled) return "border border-dashed border-border-strong bg-transparent";
  if (!status || status === "missing-in-target") return "border border-dashed border-border-strong bg-transparent";
  if (status === "in-sync") return "bg-primary shadow-[0_0_6px_var(--accent-glow)]";
  if (status === "drifted-target-newer" || status === "drifted-source-newer") return "bg-warning";
  if (status === "refused") return "bg-destructive";
  /* "unmanaged" */
  return "bg-fg-dim";
}

function tooltipText(lane: Lane, status: DriftStatus | undefined, isEnabled: boolean): string {
  const name = lane === "claude" ? "Claude Code" : lane === "cowork" ? "Cowork (zip)" : lane[0].toUpperCase() + lane.slice(1);
  if (!isEnabled) return `${name} · not enabled`;
  if (lane === "cowork") return `${name} · packaging state not yet wired`;
  if (!status || status === "missing-in-target") return `${name} · not installed`;
  if (status === "in-sync") return `${name} · in sync`;
  if (status === "drifted-target-newer") return `${name} · drift (target newer)`;
  if (status === "drifted-source-newer") return `${name} · drift (source newer)`;
  if (status === "refused") return `${name} · refused (symlink or bundle)`;
  return `${name} · ${status}`;
}

export function DriftBar({ byTarget, enabled, className }: Props) {
  return (
    <TooltipPrimitive.Provider delayDuration={120}>
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="inline-flex gap-[3px]">
          {LANES.map((lane) => {
            const isEnabled = enabled.has(lane);
            // Cowork is always dashed in this spec (no packaging-state binding yet)
            const status = lane === "cowork" ? "missing-in-target" : byTarget[lane];
            return (
              <TooltipPrimitive.Root key={lane}>
                <TooltipPrimitive.Trigger asChild>
                  <span
                    role="img"
                    aria-label={tooltipText(lane, status, isEnabled)}
                    tabIndex={0}
                    className={cn(
                      "block w-4 h-1.5 rounded-[2px] focus:outline focus:outline-1 focus:outline-primary",
                      segmentClass(status, isEnabled)
                    )}
                  />
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    className="z-50 px-2 py-1 rounded-md border border-border-strong bg-popover text-[11px] font-mono text-muted-foreground"
                    side="top"
                    sideOffset={6}
                  >
                    {tooltipText(lane, status, isEnabled)}
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            );
          })}
        </span>
        <SummaryLabel byTarget={byTarget} enabled={enabled} />
      </span>
    </TooltipPrimitive.Provider>
  );
}

function SummaryLabel({ byTarget, enabled }: { byTarget: Props["byTarget"]; enabled: Set<string> }) {
  const enabledLanes = LANES.filter((l) => enabled.has(l) && l !== "cowork");
  let inSync = 0;
  const drifted: string[] = [];
  for (const lane of enabledLanes) {
    const s = byTarget[lane];
    if (s === "in-sync") inSync += 1;
    else if (s === "drifted-target-newer" || s === "drifted-source-newer") drifted.push(lane);
  }
  if (drifted.length > 0) {
    return <span className="font-mono text-[10.5px] text-warning">{drifted[0]} · drift</span>;
  }
  return (
    <span className="font-mono text-[10.5px] text-fg-dim">
      {inSync}/{enabledLanes.length} in sync
    </span>
  );
}
