import { Kbd } from "@/components/ui/kbd";

export function CmdBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenPalette}
      aria-label="Open command palette"
      className={
        "fixed left-1/2 -translate-x-1/2 bottom-[18px] z-20 " +
        "inline-flex items-center gap-3 px-3 py-2 " +
        "rounded-full border border-border-strong " +
        "bg-popover/85 backdrop-blur " +
        "shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] " +
        "font-mono text-[11px] text-muted-foreground " +
        "hover:text-foreground transition-colors"
      }
    >
      <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>K</Kbd><span>palette</span></span>
      <span className="text-fg-faint">·</span>
      <span className="flex items-center gap-1.5"><Kbd>/</Kbd><span>filter</span></span>
      <span className="text-fg-faint">·</span>
      <span className="flex items-center gap-1.5"><Kbd>G</Kbd><Kbd>L</Kbd><span>library</span></span>
      <span className="text-fg-faint">·</span>
      <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>↵</Kbd><span>sync</span></span>
    </button>
  );
}
