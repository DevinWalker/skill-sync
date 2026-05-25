import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-5 max-w-2xl">
      <Field label="Source root">
        <div className="flex gap-2">
          <input
            className="flex-1 mono text-xs px-2 py-1.5 rounded border border-border bg-background"
            readOnly
            value={String(draft.source_root)}
          />
          <Button variant="outline" size="sm" onClick={() => pickDir("source_root")}>
            Browse
          </Button>
        </div>
      </Field>
      <Field label="Package output dir">
        <div className="flex gap-2">
          <input
            className="flex-1 mono text-xs px-2 py-1.5 rounded border border-border bg-background"
            readOnly
            value={String(draft.package_output_dir)}
          />
          <Button variant="outline" size="sm" onClick={() => pickDir("package_output_dir")}>
            Browse
          </Button>
        </div>
      </Field>
      <Field label="Enabled targets">
        <div className="flex gap-2">
          {["claude", "codex", "cursor"].map((t) => (
            <button
              key={t}
              className={
                "px-2.5 py-1 text-xs rounded border transition-colors " +
                (draft.enabled_targets.includes(t)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-secondary")
              }
              onClick={() => toggleTarget(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Show built-ins">
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.show_builtins}
            onChange={(e) => setDraft({ ...draft, show_builtins: e.target.checked })}
          />
          Show tool built-in skills in Library
        </label>
      </Field>
      <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
