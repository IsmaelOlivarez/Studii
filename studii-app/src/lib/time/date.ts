// Pure date/time helpers. Days and "now" are anchored to the library's timezone
// (LIBRARY_TZ), NOT the runtime's local zone — so the UTC poller and an out-of-town
// viewer still agree on which Eastern day is "today". See constants.ts.

import { LIBRARY_TZ } from "@/domain/constants";
import type { DateISO } from "@/domain/types";

/** Calendar "YYYY-MM-DD" of instant `d` in the library's timezone. */
function ymdInTz(d: Date): DateISO {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIBRARY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d) as DateISO;
}

/** "YYYY-MM-DD" for today + offsetDays, in the LIBRARY's timezone (not the runtime's). */
export function ymd(offsetDays = 0): DateISO {
  const today = ymdInTz(new Date());
  if (offsetDays === 0) return today;
  // Pure calendar arithmetic in UTC so adding days never drifts across a DST change
  // (we only care about the Y-M-D, and UTC has no DST).
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${base.getUTCFullYear()}-${mm}-${dd}`;
}

/** Minutes-from-midnight of the current instant, in the library's timezone. */
export function minutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIBRARY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** minutes-from-midnight -> 12h parts for display. */
export function fmtTime(min: number): {
  h: number;
  m: number;
  mer: "am" | "pm";
  str: string;
} {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const mer = h24 < 12 ? "am" : "pm";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h, m, mer, str: `${h}:${String(m).padStart(2, "0")}` };
}
