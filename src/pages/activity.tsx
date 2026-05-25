import { ActivityList } from "@/components/activity-list";

export function ActivityPage() {
  return (
    <div className="console-rise">
      <header className="px-12 pt-12 pb-10">
        <div className="eyebrow mb-5">·  Provenance log  ·  Folio III</div>
        <h1
          className="font-display text-[64px] leading-[0.95] tracking-[-0.02em]"
          style={{ fontVariationSettings: '"SOFT" 80, "opsz" 144' }}
        >
          A <span className="italic font-light">record</span> of every act
        </h1>
        <p className="mt-6 font-body italic text-[17px] text-muted-foreground max-w-xl leading-snug">
          Append-only. Every sync, pull-back, and package, dated and counter­signed by the audit log.
        </p>
        <div className="mt-10 h-px bg-foreground/30" />
      </header>
      <ActivityList />
    </div>
  );
}
