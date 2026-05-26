import { useSettings, useSetSettings } from "./use-settings";

export function useFirstRun() {
  const { data: settings, isLoading } = useSettings();
  const setMutation = useSetSettings();

  const shouldRun = !isLoading && settings != null && !settings.first_run_completed;

  const complete = (overrides: Partial<NonNullable<typeof settings>>) => {
    if (!settings) return;
    setMutation.mutate({
      ...settings,
      ...overrides,
      first_run_completed: true,
      mode_migration_announced: true, // suppress the migration toast on fresh installs
    });
  };

  return { shouldRun, settings, complete };
}
