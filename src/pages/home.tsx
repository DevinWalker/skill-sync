import { useCopy } from "@/hooks/use-copy";
import { useSkills } from "@/hooks/use-skills";
import { useDrift } from "@/hooks/use-drift";

export function HomePage() {
  const c = useCopy();
  const { data: skills = [] } = useSkills();
  const { data: _drift = {} } = useDrift();

  const total = skills.length;
  // Counts (inSync, outOfSync, orphans, unknown) derive in Task 2.2.

  return (
    <main className="px-8 pt-7 pb-20">
      <div className="mb-6">
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
          {c.homeCrumb}
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          {/* health sentence wires up in Task 2.3 */}
          Your {total} skills are syncing.
        </h1>
        <p className="mt-1 font-mono text-[11px] text-[var(--fg-dim)]">
          {/* subhead wires in Task 2.3 */}
          last scan · source path
        </p>
      </div>
    </main>
  );
}
