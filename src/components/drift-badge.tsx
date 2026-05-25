import type { DriftStatus } from "@/types/bindings";

type Config = { label: string; tone: string; mark: string };

const config: Record<DriftStatus, Config> = {
  "in-sync":              { label: "synced",    tone: "text-success",          mark: "●" },
  "drifted-target-newer": { label: "drift ↑",   tone: "text-warning",          mark: "▲" },
  "drifted-source-newer": { label: "drift ↓",   tone: "text-warning",          mark: "▼" },
  "missing-in-target":    { label: "absent",    tone: "text-muted-foreground", mark: "○" },
  "unmanaged":            { label: "linked",    tone: "text-muted-foreground", mark: "↪" },
  "refused":              { label: "refused",   tone: "text-danger",           mark: "✕" },
};

export function DriftBadge({ status }: { status: DriftStatus }) {
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${c.tone}`}
    >
      <span aria-hidden className="text-[10px] leading-none">{c.mark}</span>
      {c.label}
    </span>
  );
}
