import { ActivityList } from "@/components/activity-list";
import { useAudit } from "@/hooks/use-audit";
import { useCopy } from "@/hooks/use-copy";

export function ActivityPage() {
  const c = useCopy();
  const { data: audit = [] } = useAudit(1000);

  return (
    <div className="console-rise">
      <div className="px-8 pt-7 pb-2">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">{c.historyCrumb}</span>
        </div>
        <h1 className="font-display text-2xl">{c.historyTitle}</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          {c.historySubhead(audit.length)}
        </div>
      </div>
      <ActivityList />
    </div>
  );
}
