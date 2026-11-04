// Operating-hours helpers. Hours come from the LibCal grid itself (see normalize.ts): a
// day's `DayAvailability.open` is the list of OPEN INTERVALS = contiguous runs of returned
// slots. Reduced hours, holidays and closures fall out for free. Crucially, a library can
// have a CLOSED GAP within a day — e.g. Uris open 00:00–02:45 (late-night tail) then again
// 09:00–24:00 — so hours are a list of intervals, NOT a single bridging span (a single
// [min,max] would wrongly read the 02:45–09:00 gap as open). An empty list = closed all day.
//
// Intervals are sorted and non-overlapping. These operate on the list, never on a Library.

export type OpenHours = [number, number][];

/** Is the library open at `min`? (any interval contains it). */
export function isOpenAt(hours: OpenHours, min: number): boolean {
  return hours.some(([s, e]) => min >= s && min < e);
}

/**
 * End of the open interval covering `min` — the booking cap, since you can't book across a
 * closed gap or past close. Returns `min` unchanged when closed at `min`.
 */
export function closeAfter(hours: OpenHours, min: number): number {
  for (const [s, e] of hours) if (min >= s && min < e) return e;
  return min;
}

/**
 * If it's closed at `min` but opens later the same day, that next opening; else null
 * (open now — including mid-gap-free intervals — or closed for the rest of the day).
 */
export function opensLaterToday(hours: OpenHours, min: number): number | null {
  if (isOpenAt(hours, min)) return null;
  for (const [s] of hours) if (min < s) return s; // sorted → first start after min
  return null;
}

/** Overall [earliest open, latest close] across the day's intervals (for the axis span &
 *  labels); null when closed all day. */
export function spanOf(hours: OpenHours): [number, number] | null {
  return hours.length ? [hours[0][0], hours[hours.length - 1][1]] : null;
}

/** Merge several libraries' intervals into one sorted, non-overlapping set (the campus
 *  "open" hours — open wherever ANY library is open; closed only where all are). */
export function mergeHours(sets: OpenHours[]): OpenHours {
  const all = sets.flat().slice().sort((a, b) => a[0] - b[0]);
  const out: OpenHours = [];
  for (const [s, e] of all) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); // touching/overlapping → extend
    else out.push([s, e]);
  }
  return out;
}

/** The closed stretches of `[from, to)` not covered by any open interval (for greying). */
export function closedStretches(hours: OpenHours, from: number, to: number): [number, number][] {
  if (hours.length === 0) return from < to ? [[from, to]] : [];
  const out: [number, number][] = [];
  let cursor = from;
  for (const [s, e] of hours) {
    if (s > cursor) out.push([cursor, Math.min(s, to)]);
    cursor = Math.max(cursor, e);
    if (cursor >= to) break;
  }
  if (cursor < to) out.push([cursor, to]);
  return out;
}

/**
 * The library's "typical" operating envelope — the widest [earliest open, latest close]
 * across every returned day. Used to REPAIR today's hours: LibCal only returns FUTURE
 * slots, so today's first interval starts at ~now, not the real opening (a 24h library
 * loaded at 9pm looks like it "opens at 9pm"). null when no day has hours.
 */
export function typicalWindow(hoursList: OpenHours[]): [number, number] | null {
  let start = Infinity;
  let end = -Infinity;
  for (const h of hoursList) {
    const sp = spanOf(h);
    if (!sp) continue;
    if (sp[0] < start) start = sp[0];
    if (sp[1] > end) end = sp[1];
  }
  return Number.isFinite(start) && end > start ? [start, end] : null;
}

/**
 * The hours to DISPLAY/decide-open-status for a date. Future days are returned whole, so
 * they pass through. TODAY's first interval starts at ~now (past slots omitted), so when the
 * library is ALREADY open now we widen that FIRST interval's start back to the real opening
 * from `typical`. Only the start is touched (the end — future slots — is accurate); a start
 * still in the future is a genuine late/reduced open and is left alone. Later intervals and
 * their gaps are untouched.
 */
export function displayHours(
  dayHours: OpenHours,
  isToday: boolean,
  nowMin: number,
  typical: [number, number] | null,
): OpenHours {
  if (!isToday || dayHours.length === 0 || !typical) return dayHours;
  const [s, e] = dayHours[0];
  if (s <= nowMin && typical[0] < s) return [[typical[0], e], ...dayHours.slice(1)];
  return dayHours;
}
