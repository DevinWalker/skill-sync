import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePrimaryAction, usePrimarySearch } from "@/lib/shortcut-contexts";
import { useUIState } from "@/store/ui-state";

const SEQUENCE_TIMEOUT_MS = 1200;

export function useGlobalShortcuts({ onOpenPalette }: { onOpenPalette: () => void }) {
  const navigate = useNavigate();
  const search = usePrimarySearch();
  const action = usePrimaryAction();
  const setNewSkillOpen = useUIState((s) => s.setNewSkillOpen);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    }

    function clearPending() {
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
      }
    }

    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K — open palette
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenPalette();
        return;
      }

      // ⌘↵ — primary action
      if (meta && e.key === "Enter") {
        e.preventDefault();
        action.trigger();
        return;
      }

      // ⌘N — new skill dialog
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNewSkillOpen(true);
        return;
      }

      // Esc — close drawer/dialog handled by Radix/Sheet; no global handler needed.

      // From here on, ignore if the user is typing.
      if (isTypingTarget(e.target)) return;

      // "/" — focus primary search
      if (e.key === "/") {
        e.preventDefault();
        search.focus();
        return;
      }

      // Two-key sequences "G L/T/A/S"
      if (e.key.toLowerCase() === "g" && !meta && !e.altKey && !e.shiftKey) {
        clearPending();
        pendingG.current = window.setTimeout(clearPending, SEQUENCE_TIMEOUT_MS);
        return;
      }
      if (pendingG.current !== null && !meta && !e.altKey && !e.shiftKey) {
        clearPending();
        switch (e.key.toLowerCase()) {
          case "h": e.preventDefault(); navigate("/"); return;
          case "l": e.preventDefault(); navigate("/library"); return;
          case "t": e.preventDefault(); navigate("/targets"); return;
          case "a": e.preventDefault(); navigate("/activity"); return;
          case "s": e.preventDefault(); navigate("/settings"); return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearPending();
    };
  }, [onOpenPalette, navigate, search, action, setNewSkillOpen]);
}
