import type { DriftStatus } from "@/types/bindings";
import * as Tooltip from "@radix-ui/react-tooltip";

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  cowork: "Cowork",
};

function colorFor(status: DriftStatus | undefined): string {
  if (status === "in-sync") return "var(--primary)";
  if (status === "drifted-source-newer" || status === "drifted-target-newer") return "var(--warning)";
  if (status === "missing-in-target") return "var(--fg-faint)";
  if (status === "refused") return "var(--fg-faint)";
  return "var(--fg-faint)";
}

function tooltipFor(tool: string, status: DriftStatus | undefined): string {
  const label = TOOL_LABELS[tool] ?? tool;
  switch (status) {
    case "in-sync":
      return `In ${label} · in sync`;
    case "drifted-source-newer":
      return `In ${label} · your version is newer`;
    case "drifted-target-newer":
      return `In ${label} · their version is newer`;
    case "missing-in-target":
      return `Not in ${label}`;
    case "refused":
      return `Skill Sync wouldn't write here — looks like it's installed by ${label} itself`;
    default:
      return label;
  }
}

export function ToolIconRow({
  tools,
  perTarget,
}: {
  tools: string[];
  perTarget: Record<string, DriftStatus | undefined>;
}) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="inline-flex items-center gap-1.5">
        {tools.map((t) => {
          const status = perTarget[t];
          const dashed = status === "refused" || status === "missing-in-target";
          return (
            <Tooltip.Root key={t}>
              <Tooltip.Trigger asChild>
                <span
                  aria-label={tooltipFor(t, status)}
                  className="inline-block h-4 w-4 rounded-sm"
                  style={{
                    background: dashed ? "transparent" : colorFor(status),
                    border: `1px ${dashed ? "dashed" : "solid"} ${colorFor(status)}`,
                  }}
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="rounded-sm border border-[var(--border)] bg-[var(--popover)] px-2 py-1 font-mono text-[11px]"
                >
                  {tooltipFor(t, status)}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
}
