import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono text-[10px] leading-none",
        "px-1.5 py-0.5 rounded-[3px]",
        "border border-border bg-card text-fg-dim",
        className
      )}
    >
      {children}
    </span>
  );
}
