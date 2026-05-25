import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import { applyTheme } from "@/lib/theme";
import { Sidebar } from "./sidebar";

export function AppShell() {
  const { data } = useSettings();
  useEffect(() => {
    const theme = (data?.theme ?? "system") as "system" | "light" | "dark";
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(theme);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [data?.theme]);

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
