import { useGitStatus } from "@/hooks/use-git-status";

export function GitStatusChip() {
  const { data } = useGitStatus();
  if (!data) return null;

  const color =
    data.uncommitted > 0 ? "var(--warning)" :
    data.ahead > 0 || data.behind > 0 ? "var(--fg-dim)" :
    "var(--primary)";

  const text =
    data.uncommitted > 0
      ? `${data.branch} · ${data.uncommitted} uncommitted`
      : data.ahead > 0
      ? `${data.branch} · ${data.ahead} ahead`
      : data.behind > 0
      ? `${data.branch} · ${data.behind} behind`
      : data.branch;

  return (
    <span
      className="inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px]"
      style={{ color, borderColor: color }}
      title="Skill Sync only watches. Use your git client to commit and push."
    >
      {text}
    </span>
  );
}
