import { cn } from "@/lib/utils";

interface Props {
  inSync: number;
  drift: number;
  missing: number;
  refused: number;
  className?: string;
}

export function HealthBar({ inSync, drift, missing, refused, className }: Props) {
  const total = Math.max(1, inSync + drift + missing + refused);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className={cn("w-full h-1.5 rounded-[2px] overflow-hidden flex bg-border", className)} aria-label="target health">
      {inSync > 0  && <div style={{ width: seg(inSync) }} className="bg-primary" />}
      {drift > 0   && <div style={{ width: seg(drift) }} className="bg-warning" />}
      {missing > 0 && <div style={{ width: seg(missing) }} className="bg-fg-dim" />}
      {refused > 0 && <div style={{ width: seg(refused) }} className="bg-destructive" />}
    </div>
  );
}
