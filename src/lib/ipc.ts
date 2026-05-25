import { invoke } from "@tauri-apps/api/core";
import type { SkillView } from "@/types/bindings";

export const ipc = {
  listSkills: () => invoke<SkillView[]>("cmd_list_skills"),
};
