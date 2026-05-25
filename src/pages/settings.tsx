import { SettingsForm } from "@/components/settings-form";

export function SettingsPage() {
  return (
    <div className="console-rise">
      <header className="px-12 pt-12 pb-10">
        <div className="eyebrow mb-5">·  Curator's preferences  ·  Folio IV</div>
        <h1
          className="font-display text-[64px] leading-[0.95] tracking-[-0.02em]"
          style={{ fontVariationSettings: '"SOFT" 80, "opsz" 144' }}
        >
          The <span className="italic font-light">conditions</span> of care
        </h1>
        <p className="mt-6 font-body italic text-[17px] text-muted-foreground max-w-xl leading-snug">
          Where the source lives, what gets touched, how the archive presents itself.
        </p>
        <div className="mt-10 h-px bg-foreground/30" />
      </header>

      <div className="px-12 pb-12 max-w-3xl">
        <SettingsForm />
      </div>
    </div>
  );
}
