import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettings, useSetSettings } from "@/hooks/use-settings";
import type { Settings } from "@/types/bindings";

export function SettingsForm() {
  const { data } = useSettings();
  const save = useSetSettings();
  const [draft, setDraft] = useState<Settings | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);
  if (!draft) return null;

  const pickDir = async (key: "source_root" | "package_output_dir") => {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") setDraft({ ...draft, [key]: picked });
  };

  const toggleTarget = (name: string) => {
    const next = draft.enabled_targets.includes(name)
      ? draft.enabled_targets.filter((t) => t !== name)
      : [...draft.enabled_targets, name];
    setDraft({ ...draft, enabled_targets: next });
  };

  return (
    <div className="space-y-9">
      <Field number="i" label="Source of truth">
        <div className="flex gap-3">
          <input
            className="flex-1 font-mono text-[12px] px-3 py-2.5 border border-border bg-background"
            readOnly
            value={String(draft.source_root)}
          />
          <button
            onClick={() => pickDir("source_root")}
            className="font-mono text-[10px] uppercase tracking-widest border border-foreground/30 hover:border-primary hover:text-primary px-4 transition-colors"
          >
            Browse
          </button>
        </div>
      </Field>

      <Field number="ii" label="Package output dir">
        <div className="flex gap-3">
          <input
            className="flex-1 font-mono text-[12px] px-3 py-2.5 border border-border bg-background"
            readOnly
            value={String(draft.package_output_dir)}
          />
          <button
            onClick={() => pickDir("package_output_dir")}
            className="font-mono text-[10px] uppercase tracking-widest border border-foreground/30 hover:border-primary hover:text-primary px-4 transition-colors"
          >
            Browse
          </button>
        </div>
      </Field>

      <Field number="iii" label="Enabled targets">
        <div className="inline-flex border border-border divide-x divide-border">
          {["claude", "codex", "cursor"].map((t) => {
            const active = draft.enabled_targets.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTarget(t)}
                className={
                  "px-5 py-2.5 transition-colors font-mono text-[10px] uppercase tracking-widest " +
                  (active ? "bg-primary text-primary-foreground" : "hover:bg-secondary")
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </Field>

      <Field number="iv" label="Built-ins">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.show_builtins}
            onChange={(e) => setDraft({ ...draft, show_builtins: e.target.checked })}
            className="accent-primary w-4 h-4"
          />
          <span className="font-body text-[14px]">Surface built-in skills in the Library</span>
        </label>
      </Field>

      <Field number="v" label="Theme">
        <div className="inline-flex border border-border divide-x divide-border">
          {(["system", "light", "dark"] as const).map((t) => {
            const active = draft.theme === t;
            return (
              <button
                key={t}
                onClick={() => setDraft({ ...draft, theme: t })}
                className={
                  "px-5 py-2.5 transition-colors font-mono text-[10px] uppercase tracking-widest " +
                  (active ? "bg-primary text-primary-foreground" : "hover:bg-secondary")
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="pt-4">
        <button
          onClick={() => save.mutate(draft)}
          disabled={save.isPending}
          className="inline-flex items-center gap-3 border border-primary bg-primary text-primary-foreground px-6 py-3 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest">
            {save.isPending ? "Saving…" : "Save changes"}
          </span>
          <span className="text-[14px] leading-none">→</span>
        </button>
      </div>
    </div>
  );
}

function Field({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[3rem_1fr] gap-x-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 pt-2.5">
        {number}.
      </div>
      <div>
        <div className="eyebrow mb-2.5">{label}</div>
        {children}
      </div>
    </div>
  );
}
