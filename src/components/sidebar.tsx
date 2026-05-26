import { NavLink } from "react-router-dom";
import { Home as HomeIcon, LayoutGrid, Boxes, Clock, Package, Settings as SettingsIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/hooks/use-settings";
import { useSkills } from "@/hooks/use-skills";
import { useMode } from "@/hooks/use-mode";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import { GitStatusChip } from "./git-status-chip";
import { pickAndSaveSourceFolder } from "@/lib/pick-source-folder";
import { toast } from "@/store/toast-store";

const BUILD_SHA = import.meta.env.VITE_BUILD_SHA as string;

const ALL_TARGETS = ["claude", "codex", "cursor", "cowork"] as const;

export function Sidebar() {
  const { data: settings } = useSettings();
  const skills = useSkills();
  const mode = useMode();
  const c = useCopy();
  const qc = useQueryClient();
  const sourceRoot = settings?.source_root ?? "—";
  const enabled = new Set(settings?.enabled_targets ?? []);
  const skillCount = skills.data?.length ?? 0;

  const items =
    mode === "simple"
      ? [
          { to: "/",         label: "Home",          Icon: HomeIcon },
          { to: "/library",  label: c.libraryTitle,  Icon: LayoutGrid },
          { to: "/targets",  label: c.targetsTitle,  Icon: Boxes },
          { to: "/activity", label: c.historyTitle,  Icon: Clock },
          { to: "/settings", label: "Settings",      Icon: SettingsIcon },
        ]
      : [
          { to: "/",         label: "Home",          Icon: HomeIcon },
          { to: "/library",  label: c.libraryTitle,  Icon: LayoutGrid },
          { to: "/targets",  label: c.targetsTitle,  Icon: Boxes },
          { to: "/activity", label: c.historyTitle,  Icon: Clock },
          { to: "/packages", label: "Packages",      Icon: Package },
          { to: "/settings", label: "Settings",      Icon: SettingsIcon },
        ];

  return (
    <nav className="w-[220px] shrink-0 border-r border-border h-full flex flex-col bg-background">
      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Workspace</div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center justify-between px-2.5 py-[7px] rounded-md text-sm transition-colors",
                isActive
                  ? "bg-card text-foreground ring-1 ring-border-strong"
                  : "text-muted-foreground hover:bg-bg-hover hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="inline-flex items-center gap-2.5">
                  <item.Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </span>
                <span className={cn("font-mono text-[10.5px]", isActive ? "text-primary" : "text-fg-faint")}>
                  {item.to === "/library" ? skillCount : ""}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Source</div>
        <div className="px-2.5 py-1 font-mono text-[11.5px] text-muted-foreground truncate" title={sourceRoot}>
          {sourceRoot.replace(/^.*\/Users\/[^/]+/, "~")}
        </div>
        <div className="px-2.5 mt-1.5">
          <GitStatusChip />
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!settings) return;
            try {
              const next = await pickAndSaveSourceFolder(settings);
              if (next) qc.invalidateQueries({ queryKey: ["settings"] });
            } catch (e) {
              toast.error(`Couldn't change source: ${e}`);
            }
          }}
          className="px-2.5 py-1 block font-mono text-[11px] text-fg-dim hover:text-foreground text-left w-full"
        >
          + change source
        </button>
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Targets</div>
        {ALL_TARGETS.map((t) => (
          <NavLink
            key={t}
            to="/targets"
            className="flex items-center justify-between px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="capitalize">{t === "cowork" ? "Cowork (zip)" : t === "claude" ? "Claude Code" : t}</span>
            <span className={cn("font-mono text-[10.5px]", enabled.has(t) ? "text-primary" : "text-fg-faint")}>
              {enabled.has(t) ? "●" : "○"}
            </span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto px-3 pt-3 pb-4 border-t border-dashed border-border">
        <div className="px-2.5 font-mono text-[10.5px] text-fg-faint leading-relaxed">
          <div className="flex justify-between"><span>last sync</span><span className="text-muted-foreground">—</span></div>
          <div className="flex justify-between"><span>archive</span><span className="text-muted-foreground">~/.Trash</span></div>
          {mode === "pro" && (
            <div className="flex justify-between"><span>build</span><span className="text-muted-foreground">{BUILD_SHA}</span></div>
          )}
        </div>
      </div>
    </nav>
  );
}
