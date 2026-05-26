import { open } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc";
import type { Settings } from "@/types/bindings";

/**
 * Open the native folder picker, persist the chosen path as the new
 * source_root. Returns the picked path, or null if the user cancelled.
 */
export async function pickAndSaveSourceFolder(
  current: Settings,
): Promise<string | null> {
  const picked = await open({
    directory: true,
    defaultPath: current.source_root || undefined,
    title: "Choose your source folder",
  });
  if (typeof picked !== "string") return null;
  await ipc.setSettings({ ...current, source_root: picked });
  return picked;
}
