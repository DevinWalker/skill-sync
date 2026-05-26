import type { Orphan } from "@/lib/orphans";
import { OrphanRow } from "./orphan-row";

export function NeedsAttentionCard({
  orphans,
}: {
  orphans: Orphan[];
}) {
  if (orphans.length === 0) return null;
  const shown = orphans.slice(0, 5);
  return (
    <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
        Needs your attention
      </h2>
      <div>
        {shown.map((o) => (
          <OrphanRow
            key={o.name}
            orphan={o}
            onClaim={() => console.log("claim", o.name)}
            onRemove={(t) => console.log("remove", o.name, "from", t)}
          />
        ))}
      </div>
      {orphans.length > shown.length && (
        <p className="mt-3 text-[11px]">
          <a href="/library?filter=orphan" className="text-[var(--primary)] underline">
            view all in My Skills →
          </a>
        </p>
      )}
    </section>
  );
}
