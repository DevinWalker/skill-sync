import { useEffect, useState } from "react";
import { platform } from "@tauri-apps/plugin-os";

export type Platform = "macos" | "linux" | "windows" | "other";

function detect(p: string): Platform {
  if (p === "macos") return "macos";
  if (p === "linux") return "linux";
  if (p === "windows") return "windows";
  return "other";
}

export function usePlatform(): Platform {
  const [p, setP] = useState<Platform>("macos");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await platform();
        if (!cancelled) setP(detect(result));
      } catch {
        /* outside Tauri or plugin not initialised */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return p;
}
