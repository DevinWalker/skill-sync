import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/use-platform";
import { useSettings } from "@/hooks/use-settings";
import { Mascot } from "./mascot";
import packageJson from "../../package.json";

const APP_VERSION = packageJson.version;
const BUILD_SHA = import.meta.env.VITE_BUILD_SHA as string;

export function TitleBar() {
  const platform = usePlatform();
  const { data: settings } = useSettings();
  const targets = settings?.enabled_targets?.length ?? 0;
  const [now, setNow] = useState<string>(() => clockString());

  useEffect(() => {
    const id = window.setInterval(() => setNow(clockString()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      data-platform={platform}
      className={
        "sticky top-0 z-30 h-9 border-b border-border " +
        "flex items-center gap-2 backdrop-blur " +
        "bg-background/70 " +
        (platform === "macos" ? "pl-[70px] pr-3" : "pl-3 pr-3")
      }
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground flex items-center gap-1.5">
        <Mascot />
        <span>// SKILL.SYNC</span>
      </div>
      <div className="flex-1" />
      <div
        className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 px-2.5 py-1 border border-border rounded-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full bg-primary motion-safe:animate-console-pulse"
        />
        <span>watching · {targets} target{targets === 1 ? "" : "s"} · 30s</span>
      </div>
      <span className="font-mono text-[11px] text-fg-faint">
        v{APP_VERSION} · {BUILD_SHA} · {now}
      </span>
    </div>
  );
}

function clockString(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
