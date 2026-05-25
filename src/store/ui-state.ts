import { create } from "zustand";

interface UIState {
  selectedSkill: string | null;
  selectSkill: (name: string | null) => void;
}

export const useUIState = create<UIState>((set) => ({
  selectedSkill: null,
  selectSkill: (name) => set({ selectedSkill: name }),
}));
