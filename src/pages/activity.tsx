import { ActivityList } from "@/components/activity-list";
import { useAudit } from "@/hooks/use-audit";
import { strings } from "@/lib/copy";

export function ActivityPage() {
  const { data: audit = [] } = useAudit(1000);

  return (
    <div className="console-rise">
      <div className="px-8 pt-7 pb-2">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">{strings.historyCrumb}</span>
        </div>
        <h1 className="font-display text-2xl">{strings.historyTitle}</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          {strings.historySubhead(audit.length)}
        </div>
      </div>
      <ActivityList />
    </div>
  );
}
