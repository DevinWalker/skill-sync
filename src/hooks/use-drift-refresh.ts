import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useDriftRefresh(intervalMs = 30_000) {
  const qc = useQueryClient();
  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id == null) {
        id = window.setInterval(
          () => qc.invalidateQueries({ queryKey: ["drift"] }),
          intervalMs
        );
      }
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, qc]);
}
