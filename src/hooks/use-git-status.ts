import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { useSettings } from "./use-settings";

export function useGitStatus() {
  const { data: settings } = useSettings();
  return useQuery({
    queryKey: ["git-status", settings?.source_root],
    queryFn: () => ipc.gitStatus(settings!.source_root),
    enabled: !!settings?.source_root,
    refetchInterval: 30_000,
  });
}
