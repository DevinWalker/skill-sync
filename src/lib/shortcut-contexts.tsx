import { createContext, useCallback, useContext, useMemo, useRef } from "react";
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
//
// Storage is ref-based: the registered fn and label live in refs, not state,
// so the context value identity is stable across renders. A state-based
// implementation triggered an infinite render loop — registering a new fn
// changed the value identity, which re-ran consumer effects, which called
// setAction again, ad infinitum.

interface PrimaryActionValue {
  setAction: (fn: (() => void) | null, label?: string) => void;
  trigger: () => void;
  getLabel: () => string | null;
}

const PrimaryActionCtx = createContext<PrimaryActionValue | null>(null);

export function PrimaryActionProvider({ children }: { children: ReactNode }) {
  const fnRef = useRef<(() => void) | null>(null);
  const labelRef = useRef<string | null>(null);
  const value = useMemo<PrimaryActionValue>(
    () => ({
      setAction: (next, nextLabel) => {
        fnRef.current = next;
        labelRef.current = nextLabel ?? null;
      },
      trigger: () => {
        fnRef.current?.();
      },
      getLabel: () => labelRef.current,
    }),
    []
  );
  return <PrimaryActionCtx.Provider value={value}>{children}</PrimaryActionCtx.Provider>;
}

export function usePrimaryAction(): PrimaryActionValue {
  const v = useContext(PrimaryActionCtx);
  if (!v) throw new Error("usePrimaryAction must be used inside PrimaryActionProvider");
  return v;
}

// — PreviewActionContext ——————————————————————————————
// Pages register the handler for ⌘P. Library: open read-only sync plan.

interface PreviewActionValue {
  setAction: (fn: (() => void) | null) => void;
  trigger: () => void;
}

const PreviewActionCtx = createContext<PreviewActionValue | null>(null);

export function PreviewActionProvider({ children }: { children: ReactNode }) {
  const fnRef = useRef<(() => void) | null>(null);
  const value = useMemo<PreviewActionValue>(
    () => ({
      setAction: (next) => { fnRef.current = next; },
      trigger: () => { fnRef.current?.(); },
    }),
    []
  );
  return <PreviewActionCtx.Provider value={value}>{children}</PreviewActionCtx.Provider>;
}

export function usePreviewAction(): PreviewActionValue {
  const v = useContext(PreviewActionCtx);
  if (!v) throw new Error("usePreviewAction must be used inside PreviewActionProvider");
  return v;
}
