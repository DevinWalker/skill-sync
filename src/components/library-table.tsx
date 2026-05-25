import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { OwnerBadge } from "./owner-badge";

export function LibraryTable() {
  const skills = useSkills();
  const { data: ownership } = useOwnership();
  if (skills.isLoading) return <div className="p-8 text-muted-foreground text-sm">Scanning…</div>;
  if (skills.error) return <div className="p-8 text-danger text-sm">{String(skills.error)}</div>;
  if (!skills.data) return null;
  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs text-muted-foreground text-left">
          <th className="px-6 py-3">Skill</th>
          <th>Owner</th>
          <th>Locations</th>
        </tr>
      </thead>
      <tbody>
        {skills.data.map((s) => {
          const confirmed = ownership?.skills?.[s.name]?.class === "mine";
          return (
            <tr key={s.name} className="border-t border-border">
              <td className="px-6 py-2.5 text-sm">{s.name}</td>
              <td><OwnerBadge klass={s.class} confirmed={confirmed} /></td>
              <td className="text-xs text-muted-foreground">{s.locations.length}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
