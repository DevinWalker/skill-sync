import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { ipc } from "@/lib/ipc";

const NAME_RE = /^[a-z0-9-]+$/;

export function NewSkillDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (path: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [openInEditor, setOpenInEditor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameError =
    name.length === 0
      ? null
      : !NAME_RE.test(name)
      ? "Use lowercase letters, digits, and dashes only."
      : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = await ipc.scaffoldSkill(name, desc);
      if (openInEditor) await revealItemInDir(path).catch(() => {});
      onCreated(path, name);
      setName("");
      setDesc("");
      onClose();
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e?.message ?? "Something went wrong.";
      if (msg.toLowerCase().includes("already exists")) {
        setError(`You already have a skill called "${name}". Pick a different name.`);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-5">
          <Dialog.Title className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
            Create a new skill
          </Dialog.Title>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-[12.5px]">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-cool-skill"
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 font-mono text-[13.5px]"
              />
              <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
                This becomes the folder name. Use dashes, not spaces.
              </p>
              {nameError && <p className="mt-1 text-[11px] text-[var(--danger)]">{nameError}</p>}
            </label>
            <label className="block">
              <span className="text-[12.5px]">What does it do?</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-[13.5px]"
              />
              <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
                This is what tells the AI when to use your skill. Write it like you're
                explaining to a colleague.
              </p>
              {desc.length > 200 && (
                <p className="mt-1 text-[11px] text-[var(--warning)]">
                  Long descriptions are fine, but most skills get away with one sentence.
                </p>
              )}
            </label>
            <label className="flex items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={openInEditor}
                onChange={(e) => setOpenInEditor(e.target.checked)}
              />
              Open in editor when created
            </label>
            {error && <p className="text-[12.5px] text-[var(--danger)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !!nameError || name.length === 0}
                onClick={submit}
                className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)] disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create skill"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
