import { invoke } from "@tauri-apps/api/core";
import type { SkillView, OwnershipFile, OwnershipClass, SyncPlan } from "@/types/bindings";

export const ipc = {
  listSkills: () => invoke<SkillView[]>("cmd_list_skills"),
  getOwnership: () => invoke<OwnershipFile>("cmd_get_ownership"),
  setOwnership: (name: string, klass: OwnershipClass, note?: string | null) =>
    invoke<void>("cmd_set_ownership", { name, class: klass, note: note ?? null }),
  planSync: () => invoke<SyncPlan>("cmd_plan_sync"),
  executeSync: (plan: SyncPlan) => invoke<void>("cmd_execute_sync", { plan }),
};
