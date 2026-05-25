import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";

export function ActivityList() {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: () => ipc.readAudit(200),
  });
  if (!data?.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ul className="space-y-2">
      {data.map((e, i) => (
        <li key={i} className="text-sm border-b border-border pb-2">
          <div className="flex justify-between">
            <span>{e.kind}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(e.ts).toLocaleString()}
            </span>
          </div>
          <pre className="text-xs text-muted-foreground mt-1 mono whitespace-pre-wrap break-all">
            {JSON.stringify(e.data)}
          </pre>
        </li>
      ))}
    </ul>
  );
}
