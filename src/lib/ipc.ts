import { invoke } from "@tauri-apps/api/core";
import type {
  SkillView,
  OwnershipFile,
  OwnershipClass,
  SyncPlan,
  DriftStatus,
  Settings,
  AuditEntry,
} from "@/types/bindings";

export const ipc = {
  listSkills: () => invoke<SkillView[]>("cmd_list_skills"),
  getOwnership: () => invoke<OwnershipFile>("cmd_get_ownership"),
  setOwnership: (name: string, klass: OwnershipClass, note?: string | null) =>
    invoke<void>("cmd_set_ownership", { name, class: klass, note: note ?? null }),
  planSync: () => invoke<SyncPlan>("cmd_plan_sync"),
  executeSync: (plan: SyncPlan) => invoke<void>("cmd_execute_sync", { plan }),
  driftMatrix: () =>
    invoke<Record<string, Record<string, DriftStatus>>>("cmd_drift_matrix"),
  pullBack: (skill: string, target: string) =>
    invoke<void>("cmd_pull_back", { skill, target }),
  buildPackage: (skill: string) => invoke<string>("cmd_build_package", { skill }),
  testTargetWrite: (installPath: string) =>
    invoke<void>("cmd_test_target_write", { installPath }),
  getSettings: () => invoke<Settings>("cmd_get_settings"),
  setSettings: (settings: Settings) =>
    invoke<void>("cmd_set_settings", { settings }),
  readAudit: (limit: number) => invoke<AuditEntry[]>("cmd_read_audit", { limit }),
  scaffoldSkill: (name: string, description: string) =>
    invoke<string>("cmd_scaffold_skill", { name, description }),
};
