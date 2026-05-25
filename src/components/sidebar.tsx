import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Library" },
  { to: "/targets", label: "Targets" },
  { to: "/activity", label: "Activity" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <nav className="w-60 border-r border-border h-full flex flex-col bg-card">
      <div className="p-5 text-lg font-medium">Skill Sync</div>
      <div className="px-2 flex-1 space-y-0.5">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === "/"}
            className={({ isActive }) =>
              cn(
                "block px-3 py-2 rounded text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-foreground"
              )
            }
          >
            {i.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
