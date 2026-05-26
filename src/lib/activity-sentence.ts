import type { AuditEntry } from "@/types/bindings";

export function activitySentence(e: AuditEntry): string {
  switch (e.kind) {
    case "sync.execute":
      return `Synced ${e.data?.rows ?? "?"} skill${e.data?.rows === 1 ? "" : "s"} to all tools`;
    case "sync.commit":
      return `Synced "${e.data?.skill ?? "?"}" to ${(e.data?.targets ?? []).join(", ") || "no tools"}`;
    case "sync.pull_back":
      return `Pulled back "${e.data?.label ?? "?"}"`;
    case "pull.back":
      return `Pulled "${e.data?.skill ?? "?"}" back from ${e.data?.target ?? "?"}`;
    case "archive":
      return `Saved an older version of "${e.data?.skill ?? "?"}"`;
    case "refused":
      return `Couldn't write "${e.data?.skill ?? "?"}" to ${e.data?.target ?? "?"} — ${e.data?.reason ?? "blocked"}`;
    case "drift.detected":
      return `Noticed "${e.data?.skill ?? "?"}" changed in ${e.data?.target ?? "?"}`;
    case "package.build":
      return `Built a .skill for "${e.data?.skill ?? "?"}"`;
    default:
      return `${e.kind} · ${e.data?.skill ?? ""}`.trim();
  }
}
