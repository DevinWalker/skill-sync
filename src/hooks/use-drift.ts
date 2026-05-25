import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";

export function useDrift() {
  return useQuery({ queryKey: ["drift"], queryFn: () => ipc.driftMatrix() });
}
