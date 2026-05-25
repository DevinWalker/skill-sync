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

export function usePullBack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skill, target }: { skill: string; target: string }) =>
      ipc.pullBack(skill, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["drift"] });
    },
  });
}
