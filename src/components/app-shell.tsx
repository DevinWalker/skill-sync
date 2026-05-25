import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { applyTheme } from "@/lib/theme";
import { Sidebar } from "./sidebar";
import { TitleBar } from "./title-bar";
import { CmdBar } from "./cmd-bar";
import { CmdPalette } from "./cmd-palette";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { PrimaryActionProvider, PrimarySearchProvider } from "@/lib/shortcut-contexts";

function ShellInner() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto console-grid relative">
          <Outlet />
        </main>
      </div>
      <CmdBar onOpenPalette={() => setPaletteOpen(true)} />
      <CmdPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

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
    <PrimaryActionProvider>
      <PrimarySearchProvider>
        <ShellInner />
      </PrimarySearchProvider>
    </PrimaryActionProvider>
  );
}
