// Library operating hours. Pure logic over a Library's `hours` (see domain/types).
// A library with no `hours` is treated as always open (e.g. Butler, 24h during term).
//
// Everything is expressed within the visible day window [DAY_START, DAY_END)
// (8am–midnight). A past-midnight close (e.g. Uris Mon–Thu 3am = 1620) is clamped
// to DAY_END, so those nights read as open 9am→midnight here (the 12–3am tail is
// outside the window).

import { DAY_START, DAY_END } from "@/domain/constants";
import type { DateISO, Library } from "@/domain/types";

/** Weekday (0=Sun…6=Sat) of a "YYYY-MM-DD" date, in local time. */
function weekdayOf(dateISO: DateISO): number {
  return new Date(`${dateISO}T00:00:00`).getDay();
}

/**
 * The open window `[start, end)` within the visible day for `dateISO`, clamped to
 * [DAY_START, DAY_END). Returns `null` when the library is closed for the whole
 * visible day. `undefined` hours → always open → the full window.
 */
export function openWindow(library: Library, dateISO: DateISO): [number, number] | null {
  if (!library.hours) return [DAY_START, DAY_END];
  const h = library.hours[weekdayOf(dateISO)];
  if (!h) return null;
  const start = Math.max(h.open, DAY_START);
  const end = Math.min(h.close, DAY_END);
  return end > start ? [start, end] : null;
}

/** Is the library open at `min` on `dateISO`? */
export function isOpenAt(library: Library, dateISO: DateISO, min: number): boolean {
  const w = openWindow(library, dateISO);
  return !!w && min >= w[0] && min < w[1];
}

/**
 * If the library is closed at `min` but opens later the same visible day, the
 * opening minute; otherwise `null` (open now, or closed for the rest of the day).
 */
export function opensLaterToday(library: Library, dateISO: DateISO, min: number): number | null {
  const w = openWindow(library, dateISO);
  return w && min < w[0] ? w[0] : null;
}
