import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"],        label: "Filter / focus search" },
  { keys: ["⌘", "↵"], label: "Primary action (sync on Library)" },
  { keys: ["G", "L"], label: "Go to Library" },
  { keys: ["G", "T"], label: "Go to Targets" },
  { keys: ["G", "A"], label: "Go to Activity" },
  { keys: ["G", "S"], label: "Go to Settings" },
  { keys: ["Esc"],    label: "Close dialog / drawer" },
];

export function CmdPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="px-5 py-4 border-b border-border">
          <div className="eyebrow">Command palette · coming soon</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Fuzzy search across skills, navigation, and sync actions. For now, here are the active shortcuts.
          </div>
        </div>
        <ul className="py-2">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-2 hover:bg-bg-hover">
              <span className="text-sm">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <Kbd key={j}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
