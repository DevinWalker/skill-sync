import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useFirstRun } from "@/hooks/use-first-run";
import { useGitStatus } from "@/hooks/use-git-status";
import type { Settings } from "@/types/bindings";

type Step = "welcome" | "source" | "tools" | "scan";

const TOOL_DEFAULTS: { key: string; label: string }[] = [
  { key: "claude", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "cursor", label: "Cursor" },
  { key: "cowork", label: "Cowork (zip)" },
];

export function FirstRunModal() {
  const { shouldRun, settings, complete } = useFirstRun();
  const [step, setStep] = useState<Step>("welcome");
  const [sourceRoot, setSourceRoot] = useState<string>("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    claude: true,
    codex: true,
    cursor: true,
    cowork: false,
  });

  const gitStatus = useGitStatus();

  useEffect(() => {
    if (settings && !sourceRoot) {
      setSourceRoot(settings.source_root ?? "");
    }
  }, [settings, sourceRoot]);

  if (!shouldRun) return null;

  const goNext = (s: Step) => setStep(s);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[520px] rounded-lg border border-[var(--border)] bg-[var(--popover)] p-7">
        {step === "welcome" && (
          <>
            <p className="mb-3 font-mono text-[24px] text-[var(--primary)]">//</p>
            <h1 className="mb-3 text-[24px] font-semibold tracking-[-0.02em]">
              Let's set up Skill Sync.
            </h1>
            <p className="text-[13.5px] text-[var(--muted-foreground)]">
              Skill Sync watches the folder where you keep your skills and copies them
              into Claude Code, Codex, and other tools so they stay in sync. Takes about
              30 seconds to set up.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => goNext("source")}
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
              >
                Get started →
              </button>
            </div>
          </>
        )}

        {step === "source" && (
          <>
            <h2 className="mb-2 text-[20px] font-semibold">Where are your skills?</h2>
            <p className="mb-4 text-[13.5px] text-[var(--muted-foreground)]">
              This is the folder you edit. Skill Sync treats it as the source of truth
              and copies from here into your tools.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={sourceRoot}
                onChange={(e) => setSourceRoot(e.target.value)}
                className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 font-mono text-[12.5px]"
              />
              <button
                onClick={async () => {
                  const chosen = await openDialog({ directory: true });
                  if (typeof chosen === "string") setSourceRoot(chosen);
                }}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px]"
              >
                Choose folder…
              </button>
            </div>
            {gitStatus.data && (
              <p className="mt-3 text-[12.5px] text-[var(--primary)]">
                This is a git repo on branch <code>{gitStatus.data.branch}</code>. Skill
                Sync will keep track but won't commit for you.
              </p>
            )}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => goNext("welcome")}
                className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px]"
              >
                ← Back
              </button>
              <button
                onClick={() => goNext("tools")}
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === "tools" && (
          <>
            <h2 className="mb-2 text-[20px] font-semibold">Which tools should we sync to?</h2>
            <p className="mb-4 text-[13.5px] text-[var(--muted-foreground)]">
              You can change these any time in Settings.
            </p>
            <ul className="space-y-2">
              {TOOL_DEFAULTS.map((t) => (
                <li
                  key={t.key}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
                >
                  <p className="text-[13.5px]">{t.label}</p>
                  <label className="flex items-center gap-2 text-[12.5px]">
                    <input
                      type="checkbox"
                      checked={!!enabled[t.key]}
                      onChange={(e) => setEnabled({ ...enabled, [t.key]: e.target.checked })}
                    />
                    {enabled[t.key] ? "On" : "Off"}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => goNext("source")}
                className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px]"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  setStep("scan");
                  const enabledList = Object.entries(enabled)
                    .filter(([, on]) => on)
                    .map(([k]) => k);
                  complete({
                    source_root: sourceRoot,
                    enabled_targets: enabledList,
                  } as Partial<Settings>);
                }}
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
              >
                Start syncing →
              </button>
            </div>
          </>
        )}

        {step === "scan" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="font-mono text-[12.5px] text-[var(--fg-dim)]">
              Scanning your skills…
            </p>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--bg-hover)]">
              <div className="h-full w-1/2 animate-pulse bg-[var(--primary)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
