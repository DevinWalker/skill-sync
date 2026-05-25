import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { SyncPlan } from "@/types/bindings";

export function usePlanSync() {
  return useMutation({ mutationFn: () => ipc.planSync() });
}

export function useExecuteSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: SyncPlan) => ipc.executeSync(plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["drift"] });
    },
  });
}
