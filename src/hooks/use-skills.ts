import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";

export function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: () => ipc.listSkills() });
}
