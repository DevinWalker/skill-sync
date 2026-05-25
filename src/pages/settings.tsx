import { SettingsForm } from "@/components/settings-form";

export function SettingsPage() {
  return (
    <div className="py-6 px-8 space-y-4">
      <h1 className="text-lg">Settings</h1>
      <SettingsForm />
    </div>
  );
}
