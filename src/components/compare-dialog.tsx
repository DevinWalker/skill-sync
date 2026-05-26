import * as Dialog from "@radix-ui/react-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { friendlyTime } from "@/lib/time";

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  cowork: "Cowork",
};

export function CompareDialog({
  open,
  onClose,
  skillName,
  tool,
  yourPath,
  yourUpdated,
  theirPath,
  theirUpdated,
}: {
  open: boolean;
  onClose: () => void;
  skillName: string;
  tool: string;
  yourPath: string;
  yourUpdated: string;
  theirPath: string;
  theirUpdated: string;
}) {
  const toolLabel = TOOL_LABELS[tool] ?? tool;
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-5">
          <Dialog.Title className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
            Compare with {toolLabel}
          </Dialog.Title>
          <Dialog.Description className="text-[13.5px] text-[var(--foreground)]">
            Your version of <code className="font-mono">{skillName}</code> was last edited{" "}
            <strong>{friendlyTime(yourUpdated)}</strong>. {toolLabel}'s version was last edited{" "}
            <strong>{friendlyTime(theirUpdated)}</strong>. They're different.
          </Dialog.Description>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                revealItemInDir(yourPath).catch(() => {});
                revealItemInDir(theirPath).catch(() => {});
              }}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)]"
            >
              Open both files
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
