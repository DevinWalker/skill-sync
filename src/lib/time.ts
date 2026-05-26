export function friendlyTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
