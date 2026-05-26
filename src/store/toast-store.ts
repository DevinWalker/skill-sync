import { create } from "zustand";
import React from "react";

export interface Toast {
  id: number;
  msg: React.ReactNode;
  tone?: "success" | "error";
  action?: { label: string; onClick: () => void };
  ttlMs?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { ...t, id }] });
    const ttl = t.ttlMs ?? 5000;
    if (ttl > 0) setTimeout(() => get().dismiss(id), ttl);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// Convenience helpers — usable outside React.
export const toast = {
  success: (msg: React.ReactNode, action?: Toast["action"]) =>
    useToastStore.getState().push({ msg, tone: "success", action }),
  error: (msg: React.ReactNode, action?: Toast["action"]) =>
    useToastStore.getState().push({ msg, tone: "error", action }),
};
