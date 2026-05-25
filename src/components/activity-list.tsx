import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";

const kindLabel: Record<string, string> = {
  "sync.execute":   "Sync committed",
  "sync.pull_back": "Pulled back to source",
  "package.build":  "Package built",
};

export function ActivityList() {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: () => ipc.readAudit(200),
  });
  if (!data?.length) {
    return (
      <div className="px-12 py-16">
        <p className="font-body italic text-muted-foreground text-[15px]">
          No events yet. The curator has been quiet.
        </p>
      </div>
    );
  }
  return (
    <ol className="border-t border-border">
      {data.map((e, i) => {
        const date = new Date(e.ts);
        return (
          <li
            key={i}
            className="archive-rise grid grid-cols-[5rem_1fr_auto] gap-x-8 px-12 py-5 border-b border-border last:border-b-0 items-baseline"
            style={{ animationDelay: `${Math.min(i * 24, 320)}ms` }}
          >
            <div className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest pt-1">
              {String(i + 1).padStart(3, "0")}
            </div>
            <div>
              <div
                className="font-display text-[20px] leading-tight tracking-tight"
                style={{ fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
              >
                {kindLabel[e.kind] ?? e.kind}
              </div>
              <pre className="mt-1.5 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(e.data)}
              </pre>
            </div>
            <div className="text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              <div>{date.toLocaleDateString()}</div>
              <div className="text-muted-foreground/60">{date.toLocaleTimeString()}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
