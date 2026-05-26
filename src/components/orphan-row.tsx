import type { Orphan } from "@/lib/orphans";

export function OrphanRow({
  orphan,
  onClaim,
  onRemove,
}: {
  orphan: Orphan;
  onClaim: () => void;
  onRemove: (tool: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border)] last:border-0">
      <p className="text-[13.5px]">
        <code className="font-mono text-[var(--foreground)]">{orphan.name}</code>{" "}
        <span className="text-[var(--fg-dim)]">
          lives in {orphan.tools.join(", ")} but not in your source.
        </span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClaim}
          className="rounded-md bg-[var(--primary)] px-3 py-1 text-[11px] font-medium text-[var(--primary-foreground)]"
        >
          Claim
        </button>
        {orphan.tools.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onRemove(t)}
            className="rounded-md border border-[var(--border-strong)] px-3 py-1 text-[11px] text-[var(--danger)] hover:bg-[var(--bg-hover)]"
          >
            Remove from {t}
          </button>
        ))}
      </div>
    </div>
  );
}
