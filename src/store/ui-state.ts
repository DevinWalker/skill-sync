import { create } from "zustand";

interface UIState {
  selectedSkill: string | null;
  selectSkill: (name: string | null) => void;
  newSkillOpen: boolean;
  setNewSkillOpen: (open: boolean) => void;
}

export const useUIState = create<UIState>((set) => ({
  selectedSkill: null,
  selectSkill: (name) => set({ selectedSkill: name }),
  newSkillOpen: false,
  setNewSkillOpen: (open) => set({ newSkillOpen: open }),
}));
