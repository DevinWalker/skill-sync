import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/hooks/use-settings";
import { applyTheme } from "@/lib/theme";
import { Sidebar } from "./sidebar";
import { TitleBar } from "./title-bar";
import { CmdBar } from "./cmd-bar";
import { CmdPalette } from "./cmd-palette";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { PrimaryActionProvider, PrimarySearchProvider } from "@/lib/shortcut-contexts";
import { useModeMigrationToast } from "@/hooks/use-mode-migration-toast";
import { NewSkillDialog } from "@/components/new-skill-dialog";
import { FirstRunModal } from "@/components/first-run-modal";
import { useUIState } from "@/store/ui-state";

function ShellInner() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [migrationToast, setMigrationToast] = useState<{
    msg: string;
    try: () => void;
    stay: () => void;
  } | null>(null);
  const newSkillOpen = useUIState((s) => s.newSkillOpen);
  const setNewSkillOpen = useUIState((s) => s.setNewSkillOpen);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [createdToast, setCreatedToast] = useState<{ name: string } | null>(null);

  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });
  useModeMigrationToast((msg, actions) =>
    setMigrationToast(
      actions ? { msg, try: actions.try, stay: actions.stay } : null,
    ),
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <FirstRunModal />
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto console-grid relative">
          <Outlet />
        </main>
      </div>
      <CmdBar onOpenPalette={() => setPaletteOpen(true)} />
      <CmdPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NewSkillDialog
        open={newSkillOpen}
        onClose={() => setNewSkillOpen(false)}
        onCreated={(_path, name) => {
          qc.invalidateQueries({ queryKey: ["skills"] });
          qc.invalidateQueries({ queryKey: ["drift"] });
          setCreatedToast({ name });
          setTimeout(() => setCreatedToast(null), 5000);
        }}
      />
      {createdToast && (
        <div
          role="status"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--popover)] px-4 py-2.5 text-[12.5px] shadow-lg"
        >
          <span>
            Created <code className="font-mono">{createdToast.name}</code>. Sync it to your tools when you're ready.
          </span>
          <button
            onClick={() => {
              nav("/");
              setCreatedToast(null);
            }}
            className="font-mono text-[11px] text-[var(--primary)]"
          >
            Sync now
          </button>
        </div>
      )}
      {migrationToast && (
        <div
          role="status"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--popover)] px-4 py-2.5 text-[12.5px] shadow-lg"
        >
          <span>{migrationToast.msg}</span>
          <button
            onClick={() => {
              migrationToast.try();
              setMigrationToast(null);
            }}
            className="font-mono text-[11px] text-[var(--primary)]"
          >
            Try Simple
          </button>
          <button
            onClick={() => {
              migrationToast.stay();
              setMigrationToast(null);
            }}
            className="font-mono text-[11px] text-[var(--fg-dim)]"
          >
            Stay in Pro
          </button>
        </div>
      )}
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
