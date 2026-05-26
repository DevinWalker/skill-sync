import { Badge } from "@/components/ui/badge";
import type { Class } from "@/types/bindings";

const dot = (
  <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
);

export function OwnerBadge({ klass, confirmed }: { klass: Class; confirmed?: boolean }) {
  if (confirmed && klass === "MineHeuristic") {
    return <Badge variant="primary">{dot}Mine</Badge>;
  }
  switch (klass) {
    case "MineHeuristic":
      return <Badge variant="warning">{dot}Mine · auto</Badge>;
    case "Bundle":
      return <Badge variant="info">{dot}Bundle</Badge>;
    case "ToolBuiltin":
      return <Badge variant="violet">{dot}Built-in</Badge>;
    case "Unknown":
      return <Badge variant="warning">{dot}Unknown</Badge>;
  }
}
