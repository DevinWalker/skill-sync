import { ActivityList } from "@/components/activity-list";

export function ActivityPage() {
  return (
    <div className="console-rise">
      <div className="px-8 pt-7 pb-2">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">activity</span>
        </div>
        <h1 className="font-display text-2xl">Activity</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          Append-only audit log · every sync, pull, refusal, and archive
        </div>
      </div>
      <ActivityList />
    </div>
  );
}
