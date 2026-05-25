import { useSkills } from "@/hooks/use-skills";
import { OwnerBadge } from "./owner-badge";

export function LibraryTable() {
  const { data, isLoading, error } = useSkills();
  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Scanning…</div>;
  if (error) return <div className="p-8 text-danger text-sm">{String(error)}</div>;
  if (!data) return null;
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
        {data.map((s) => (
          <tr key={s.name} className="border-t border-border">
            <td className="px-6 py-2.5 text-sm">{s.name}</td>
            <td><OwnerBadge klass={s.class} /></td>
            <td className="text-xs text-muted-foreground">{s.locations.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
