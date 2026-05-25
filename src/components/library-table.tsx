import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";

const TARGETS = ["claude", "codex", "cursor"] as const;

export function LibraryTable() {
  const skills = useSkills();
  const { data: ownership } = useOwnership();
  const drift = useDrift();
  if (skills.isLoading) return <div className="p-8 text-muted-foreground text-sm">Scanning…</div>;
  if (skills.error) return <div className="p-8 text-danger text-sm">{String(skills.error)}</div>;
  if (!skills.data) return null;
  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs text-muted-foreground text-left">
          <th className="px-6 py-3">Skill</th>
          <th>Owner</th>
          {TARGETS.map((t) => (
            <th key={t} className="capitalize">{t}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {skills.data.map((s) => {
          const confirmed = ownership?.skills?.[s.name]?.class === "mine";
          const row = drift.data?.[s.name] ?? {};
          return (
            <tr key={s.name} className="border-t border-border">
              <td className="px-6 py-2.5 text-sm">{s.name}</td>
              <td><OwnerBadge klass={s.class} confirmed={confirmed} /></td>
              {TARGETS.map((t) => (
                <td key={t}>
                  {row[t] ? <DriftBadge status={row[t]} /> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
