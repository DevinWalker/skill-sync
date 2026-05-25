import { useSetOwnership } from "@/hooks/use-ownership";
import type { OwnershipClass } from "@/types/bindings";

const OPTIONS: { value: OwnershipClass; label: string; mark: string }[] = [
  { value: "mine",     label: "Mine",     mark: "◆" },
  { value: "external", label: "External", mark: "○" },
  { value: "ignore",   label: "Ignore",   mark: "·" },
];

export function OwnershipPicker({
  name,
  current,
}: {
  name: string;
  current?: OwnershipClass;
}) {
  const set = useSetOwnership();
  return (
    <div className="inline-flex border border-border divide-x divide-border">
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            onClick={() => set.mutate({ name, klass: o.value })}
            className={
              "inline-flex items-center gap-2 px-4 py-2 transition-colors " +
              (active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-foreground")
            }
          >
            <span aria-hidden className="text-[14px] leading-none">{o.mark}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
