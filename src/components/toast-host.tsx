import { useToastStore } from "@/store/toast-store";

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (!toasts.length) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-stretch gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "flex items-center gap-3 rounded-md border bg-[var(--popover)] px-4 py-2.5 text-[12.5px] shadow-lg " +
            (t.tone === "error"
              ? "border-[var(--destructive)] text-[var(--destructive)]"
              : "border-[var(--border)] text-[var(--foreground)]")
          }
        >
          <span className="flex-1">{t.msg}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="font-mono text-[11px] text-[var(--primary)]"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="font-mono text-[11px] text-[var(--fg-dim)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
