import { useSettings } from "./use-settings";
import type { Mode } from "@/lib/copy";

export function useMode(): Mode {
  const { data } = useSettings();
  return data?.mode === "pro" ? "pro" : "simple";
}
