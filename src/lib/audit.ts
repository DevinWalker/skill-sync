import type { AuditEntry } from "@/types/bindings";

const MS_PER_DAY = 86_400_000;

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Returns an array of 7 numbers: count of archive events per day,
 *  oldest first, newest last (today). Buckets by local calendar date,
 *  so a UTC-serialised event timestamp lands in the user's local day. */
export function bucketArchivesByDay(entries: AuditEntry[], now: Date = new Date()): number[] {
  const buckets = new Array(7).fill(0);
  const todayMs = localMidnight(now);
  for (const e of entries) {
    if (e.kind !== "archive") continue;
    const t = Date.parse(e.ts);
    if (Number.isNaN(t)) continue;
    const days = Math.round((todayMs - localMidnight(new Date(t))) / MS_PER_DAY);
    if (days < 0 || days > 6) continue;
    buckets[6 - days] += 1;
  }
  return buckets;
}
