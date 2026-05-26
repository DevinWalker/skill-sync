import { copy, type CopyMap } from "@/lib/copy";
import { useMode } from "./use-mode";

export function useCopy(): CopyMap {
  const mode = useMode();
  return copy[mode] as CopyMap;
}
