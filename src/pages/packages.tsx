import { useQuery } from "@tanstack/react-query";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useSettings } from "@/hooks/use-settings";
import { ipc } from "@/lib/ipc";
import { friendlyTime } from "@/lib/time";

export function PackagesPage() {
  const { data: settings } = useSettings();
  const { data: pkgs } = useQuery({
    queryKey: ["packages"],
    queryFn: () => ipc.listPackages(),
    refetchOnWindowFocus: true,
  });

  const outputDir = (settings?.package_output_dir ?? "").replace(/^.*\/Users\/[^/]+/, "~");

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint mb-3">
          {(settings?.source_root ?? "").replace(/^.*\/Users\/[^/]+/, "~")} › packages
        </div>
        <h1 className="font-display text-2xl text-foreground">Packages</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          {outputDir || "package output directory not set"}
        </div>
      </div>

      <div className="px-8 pb-12 mt-6">
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_140px_100px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">File</div>
            <div className="eyebrow text-right">Size</div>
            <div className="eyebrow">Updated</div>
            <div className="eyebrow"></div>
          </div>
          {!pkgs?.length ? (
            <div className="px-3.5 py-10 text-center font-mono text-[11.5px] text-fg-dim">
              No .skill files yet. Use Build .skill in the drawer to generate one.
            </div>
          ) : (
            <ul>
              {pkgs.map((p) => (
                <li
                  key={p.name}
                  className="grid grid-cols-[1fr_100px_140px_100px] gap-x-3 items-center px-3.5 py-3 border-b border-border last:border-b-0"
                >
                  <div className="text-foreground font-medium text-sm truncate">{p.name}</div>
                  <div className="font-mono text-[11.5px] text-fg-dim text-right">
                    {(Number(p.size_bytes) / 1024).toFixed(1)} kB
                  </div>
                  <div className="font-mono text-[11.5px] text-muted-foreground">
                    {friendlyTime(p.modified_at)}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => revealItemInDir(String(p.path)).catch(() => {})}
                      className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:bg-bg-hover"
                    >
                      Reveal
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
