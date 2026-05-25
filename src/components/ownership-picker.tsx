import { useSetOwnership } from "@/hooks/use-ownership";
import type { OwnershipClass } from "@/types/bindings";

const OPTIONS: { value: OwnershipClass; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "external", label: "External" },
  { value: "ignore", label: "Ignore" },
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
    <div className="flex gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => set.mutate({ name, klass: o.value })}
          className={
            "px-2.5 py-1 text-xs rounded border transition-colors " +
            (current === o.value
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-secondary")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
