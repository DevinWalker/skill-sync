import { useSettings, useSetSettings } from "@/hooks/use-settings";
import { useMode } from "@/hooks/use-mode";
import { useCopy } from "@/hooks/use-copy";

export function ModeSwitch() {
  const { data: settings } = useSettings();
  const set = useSetSettings();
  const mode = useMode();
  const c = useCopy();

  if (!settings) return null;

  const flip = (next: "simple" | "pro") => {
    if (next === mode) return;
    set.mutate({ ...settings, mode: next });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label="Mode"
        className="inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--card)] p-0.5"
      >
        {(["simple", "pro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => flip(m)}
            className={
              "px-3 text-[12.5px] capitalize font-mono rounded-sm transition-colors " +
              (mode === m
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")
            }
          >
            {m}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[var(--fg-dim)]">{c.modeExplainer}</p>
    </div>
  );
}
