import { useEffect, useRef } from "react";
import { useSettings, useSetSettings } from "./use-settings";

/**
 * Detects existing-install migration (mode_migration_announced === false but
 * mode === "pro" via the serde default) and surfaces a one-time toast.
 *
 * The new field defaults to false on legacy settings; on fresh defaults() it
 * is also false, but fresh installs go through first-run which sets mode to
 * "simple" and marks the toast unnecessary by setting the flag to true
 * silently when first-run completes.
 */
export function useModeMigrationToast(
  show: (message: string, actions?: { try: () => void; stay: () => void }) => void,
): void {
  const { data: settings } = useSettings();
  const set = useSetSettings();
  const shown = useRef(false);

  useEffect(() => {
    if (!settings || shown.current) return;
    if (settings.mode_migration_announced) return;
    if (!settings.first_run_completed && settings.mode === "simple") return; // brand new install
    if (settings.mode !== "pro") return;

    shown.current = true;
    show(
      "We added a Simple mode that hides the deeper details. You're in Pro now.",
      {
        try: () => {
          set.mutate({ ...settings, mode: "simple", mode_migration_announced: true });
        },
        stay: () => {
          set.mutate({ ...settings, mode_migration_announced: true });
        },
      },
    );
  }, [settings, set, show]);
}
