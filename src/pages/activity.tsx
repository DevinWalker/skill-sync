import { ActivityList } from "@/components/activity-list";

export function ActivityPage() {
  return (
    <div className="py-6 px-8 space-y-4">
      <h1 className="text-lg">Activity</h1>
      <ActivityList />
    </div>
  );
}
