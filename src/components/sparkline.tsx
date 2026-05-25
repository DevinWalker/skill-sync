import { cn } from "@/lib/utils";

interface Props {
  values: number[];
  /** Index of the bar to flare amber (e.g. day with drift). */
  hotIndex?: number;
  className?: string;
}

export function Sparkline({ values, hotIndex, className }: Props) {
  const max = Math.max(1, ...values);
  return (
    <span className={cn("inline-flex items-end gap-[2px] h-3.5", className)} aria-hidden>
      {values.map((v, i) => {
        const pct = Math.max(8, Math.round((v / max) * 100));
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-[1px]",
              i === hotIndex ? "bg-warning" : "bg-fg-faint"
            )}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </span>
  );
}
