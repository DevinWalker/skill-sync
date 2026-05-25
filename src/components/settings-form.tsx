import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { ipc } from "@/lib/ipc";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types/bindings";
import packageJson from "../../package.json";

const TARGETS = ["claude", "codex", "cursor", "cowork"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-5 mt-5 first:border-t-0 first:pt-0 first:mt-0">
      <div className="eyebrow mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="font-mono text-[11px] text-fg-dim mt-1 leading-relaxed">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsForm() {
  const { data, refetch } = useSettings();
  const [busy, setBusy] = useState(false);

  if (!data) return <div className="px-8 py-12 eyebrow">Loading…</div>;

  async function update(patch: Partial<Settings>) {
    setBusy(true);
    try {
      const next: Settings = { ...data!, ...patch };
      await ipc.setSettings(next);
      await refetch();
      if (patch.theme) applyTheme(patch.theme as "system" | "light" | "dark");
    } finally {
      setBusy(false);
    }
  }

  const enabled = new Set(data.enabled_targets);

  return (
    <div className="px-8 pb-12 max-w-3xl">
      <Section title="Source">
        <Row label="Source root" hint="Where you author skills. Used as the source of truth for syncs.">
          <input
            value={data.source_root}
            onChange={(e) => update({ source_root: e.target.value })}
            className="w-full h-8 px-3 bg-card border border-border rounded-md font-mono text-[12.5px] text-foreground"
            disabled={busy}
          />
        </Row>
        <Row label="Show built-ins" hint="Display skills that come from anthropic-skills bundles.">
          <Toggle on={data.show_builtins} onClick={() => update({ show_builtins: !data.show_builtins })} disabled={busy} />
        </Row>
      </Section>

      <Section title="Targets">
        {TARGETS.map((t) => (
          <Row
            key={t}
            label={t === "claude" ? "Claude Code" : t === "cowork" ? "Cowork (.skill)" : t[0].toUpperCase() + t.slice(1)}
            hint={t === "cowork" ? "Built as zip archives, not a directory mirror." : `Mirrors the source tree into ~/.${t}/skills.`}
          >
            <Toggle
              on={enabled.has(t)}
              onClick={() => {
                const next = enabled.has(t)
                  ? data.enabled_targets.filter((x) => x !== t)
                  : [...data.enabled_targets, t];
                update({ enabled_targets: next });
              }}
              disabled={busy}
            />
          </Row>
        ))}
      </Section>

      <Section title="Packaging">
        <Row label="Package output dir" hint="Where .skill zips are written when you build for Cowork.">
          <input
            value={data.package_output_dir}
            onChange={(e) => update({ package_output_dir: e.target.value })}
            className="w-full h-8 px-3 bg-card border border-border rounded-md font-mono text-[12.5px] text-foreground"
            disabled={busy}
          />
        </Row>
        <Row label="Cowork packaging" hint="Enable building .skill zips for Cowork.">
          <Toggle on={data.cowork_package_enabled} onClick={() => update({ cowork_package_enabled: !data.cowork_package_enabled })} disabled={busy} />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Theme" hint="System follows your OS preference.">
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-card border border-border rounded-md">
            {(["system", "light", "dark"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => update({ theme: opt })}
                disabled={busy}
                className={cn(
                  "px-3 py-1 rounded font-mono text-[11px] text-muted-foreground transition-colors disabled:opacity-50",
                  data.theme === opt ? "bg-bg-hover text-foreground ring-1 ring-border-strong" : "hover:text-foreground"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Diagnostics">
        <Row label="Build" hint="Git short-sha and app version.">
          <span className="font-mono text-[12px] text-muted-foreground">
            v{packageJson.version} · {import.meta.env.VITE_BUILD_SHA as string}
          </span>
        </Row>
        <Row label="Config directory" hint="Settings, ownership, targets, and audit log live here.">
          <span className="font-mono text-[11.5px] text-muted-foreground break-all">
            ~/Library/Application Support/skill-sync
          </span>
        </Row>
      </Section>
    </div>
  );
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-block w-9 h-5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        on ? "bg-primary" : "bg-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}
