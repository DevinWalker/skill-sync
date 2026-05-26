import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { Settings } from "@/types/bindings";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => ipc.getSettings() });
}

export function useSetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Settings) => ipc.setSettings(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: Settings) => {
      await ipc.setSettings(next);
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
