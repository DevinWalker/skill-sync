import { useState } from "react";
import { ipc } from "@/lib/ipc";

const GLYPH: Record<string, string> = {
  claude: "CL", codex: "CX", cursor: "CR", cowork: "CW",
};

export function TargetCard({
  name,
  path,
  kind,
}: {
  name: string;
  path?: string;
  kind: "directory-mirror" | "package-only";
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const test = async () => {
    if (!path) return;
    try {
      await ipc.testTargetWrite(path);
      setStatus("ok");
      setMsg(null);
    } catch (e) {
      setStatus("fail");
      setMsg(String(e));
    }
  };

  const kindLabel = kind === "directory-mirror" ? "Directory mirror" : "Package only";

  return (
    <div className="border border-border bg-card p-7 flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow text-[9.5px] mb-3">{kindLabel}</div>
          <h3
            className="font-display text-[32px] leading-none capitalize tracking-tight"
            style={{ fontVariationSettings: '"SOFT" 50, "opsz" 144' }}
          >
            {name}
          </h3>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground/60">
          {GLYPH[name] ?? "··"}
        </div>
      </div>

      <div className="h-px bg-border my-6" />

      {path ? (
        <div className="font-mono text-[11px] text-muted-foreground break-all">{path}</div>
      ) : (
        <div className="font-body italic text-[13px] text-muted-foreground">
          Loads its own bundle. Use Build .skill to export.
        </div>
      )}

      {kind === "directory-mirror" && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={test}
            disabled={!path}
            className="inline-flex items-center gap-2 border border-foreground/30 hover:border-primary hover:text-primary px-3.5 py-1.5 transition-colors disabled:opacity-40"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest">Test write</span>
          </button>
          {status === "ok" && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-success">
              <span aria-hidden>●</span> Writable
            </span>
          )}
          {status === "fail" && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-danger truncate" title={msg ?? ""}>
              ✕ {msg}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
