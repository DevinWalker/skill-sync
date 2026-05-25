import { NavLink } from "react-router-dom";
import { LayoutGrid, Boxes, Clock, Package } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useSkills } from "@/hooks/use-skills";
import { cn } from "@/lib/utils";

const BUILD_SHA = import.meta.env.VITE_BUILD_SHA as string;

const ITEMS = [
  { to: "/",         label: "Library",  Icon: LayoutGrid },
  { to: "/targets",  label: "Targets",  Icon: Boxes },
  { to: "/activity", label: "Activity", Icon: Clock },
  { to: "/settings", label: "Settings", Icon: Package }, // Settings as last; Packages is a future view
] as const;

const ALL_TARGETS = ["claude", "codex", "cursor", "cowork"] as const;

export function Sidebar() {
  const { data: settings } = useSettings();
  const skills = useSkills();
  const sourceRoot = settings?.source_root ?? "—";
  const enabled = new Set(settings?.enabled_targets ?? []);
  const skillCount = skills.data?.length ?? 0;

  return (
    <nav className="w-[220px] shrink-0 border-r border-border h-full flex flex-col bg-background">
      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Workspace</div>
        {ITEMS.map((item) => (
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
                  {item.label === "Library" ? skillCount : ""}
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
        <NavLink to="/settings" className="px-2.5 py-1 block font-mono text-[11px] text-fg-faint hover:text-foreground">
          + change source
        </NavLink>
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
          <div className="flex justify-between"><span>build</span><span className="text-muted-foreground">{BUILD_SHA}</span></div>
        </div>
      </div>
    </nav>
  );
}
