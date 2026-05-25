import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/",         label: "Library",  num: "i"  },
  { to: "/targets",  label: "Targets",  num: "ii" },
  { to: "/activity", label: "Activity", num: "iii" },
  { to: "/settings", label: "Settings", num: "iv"  },
];

export function Sidebar() {
  return (
    <nav className="w-[228px] border-r border-border h-full flex flex-col bg-card">
      {/* Brand mark */}
      <div className="p-6 pb-7 border-b border-border">
        <div className="eyebrow mb-3">№ 001 · Archive</div>
        <div className="font-display text-[28px] leading-[0.95] tracking-tight">
          Skill
          <br />
          <span className="italic font-light" style={{ fontVariationSettings: '"SOFT" 100, "opsz" 144' }}>
            Sync
          </span>
        </div>
        <div className="eyebrow mt-3 text-[9.5px]">A provenance archive</div>
      </div>

      {/* Nav */}
      <div className="px-4 pt-6 flex-1 space-y-px">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex items-baseline gap-3 px-2 py-2.5 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-widest w-5 shrink-0 pt-0.5",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                >
                  {i.num}.
                </span>
                <span className="font-display text-[17px] tracking-tight">{i.label}</span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-px bg-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer mark */}
      <div className="p-6 border-t border-border">
        <div className="eyebrow text-[9px] mb-1">Curator</div>
        <div className="font-mono text-[11px] text-muted-foreground">~/skill-sync</div>
      </div>
    </nav>
  );
}
