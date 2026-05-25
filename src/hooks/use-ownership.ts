import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { OwnershipClass } from "@/types/bindings";

export function useOwnership() {
  return useQuery({ queryKey: ["ownership"], queryFn: () => ipc.getOwnership() });
}

export function useSetOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, klass, note }: { name: string; klass: OwnershipClass; note?: string }) =>
      ipc.setOwnership(name, klass, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownership"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}
