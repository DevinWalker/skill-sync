import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

// — PrimarySearchContext ——————————————————————————————
// Pages register the ref of their primary search input here.
// The "/" global shortcut focuses whatever ref is currently registered.

interface PrimarySearchValue {
  register: (ref: RefObject<HTMLInputElement | null>) => void;
  focus: () => void;
}

const PrimarySearchCtx = createContext<PrimarySearchValue | null>(null);

export function PrimarySearchProvider({ children }: { children: ReactNode }) {
  const ref = useRef<RefObject<HTMLInputElement | null> | null>(null);
  const register = useCallback((r: RefObject<HTMLInputElement | null>) => {
    ref.current = r;
  }, []);
  const focus = useCallback(() => {
    ref.current?.current?.focus();
    ref.current?.current?.select();
  }, []);
  const value = useMemo(() => ({ register, focus }), [register, focus]);
  return <PrimarySearchCtx.Provider value={value}>{children}</PrimarySearchCtx.Provider>;
}

export function usePrimarySearch(): PrimarySearchValue {
  const v = useContext(PrimarySearchCtx);
  if (!v) throw new Error("usePrimarySearch must be used inside PrimarySearchProvider");
  return v;
}

// — PrimaryActionContext ——————————————————————————————
// Pages register the handler for ⌘↵. Library: Sync mine. Others: no-op.

interface PrimaryActionValue {
  setAction: (fn: (() => void) | null, label?: string) => void;
  trigger: () => void;
  label: string | null;
}

const PrimaryActionCtx = createContext<PrimaryActionValue | null>(null);

export function PrimaryActionProvider({ children }: { children: ReactNode }) {
  const [fn, setFn] = useState<(() => void) | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const setAction = useCallback((next: (() => void) | null, nextLabel?: string) => {
    setFn(() => next);
    setLabel(nextLabel ?? null);
  }, []);
  const trigger = useCallback(() => {
    fn?.();
  }, [fn]);
  const value = useMemo(() => ({ setAction, trigger, label }), [setAction, trigger, label]);
  return <PrimaryActionCtx.Provider value={value}>{children}</PrimaryActionCtx.Provider>;
}

export function usePrimaryAction(): PrimaryActionValue {
  const v = useContext(PrimaryActionCtx);
  if (!v) throw new Error("usePrimaryAction must be used inside PrimaryActionProvider");
  return v;
}
