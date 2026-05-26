import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";

export function useAudit(limit: number = 200) {
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: () => ipc.readAudit(limit),
  });
}
