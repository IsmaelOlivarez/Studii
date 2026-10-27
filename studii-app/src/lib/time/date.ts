// Pure date/time formatting helpers (local time).

import type { DateISO } from "@/domain/types";

/** "YYYY-MM-DD" for today + offsetDays, in LOCAL time (not UTC). */
export function ymd(offsetDays = 0): DateISO {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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
