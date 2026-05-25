import { SettingsForm } from "@/components/settings-form";

export function SettingsPage() {
  return (
    <div className="console-rise">
      <div className="px-8 pt-7 pb-4">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">settings</span>
        </div>
        <h1 className="font-display text-2xl">Settings</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          Source · 4 targets · packaging · appearance · diagnostics
        </div>
      </div>
      <SettingsForm />
    </div>
  );
}
