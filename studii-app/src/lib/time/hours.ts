// Operating-hours helpers. Hours come from the LibCal grid itself — each day's
// `DayAvailability.open` window = the span of returned slots (see normalize.ts) —
// so reduced hours, holidays and closures are handled with no hardcoding. A day the
// grid never returned has NO window (`null`) and is treated as CLOSED all day.
//
// These operate on a window tuple `[startMin, endMin)` (or null), not on a Library.

export type OpenWindow = [number, number] | null;

/** Is the library open at `min`? (false when `win` is null → closed all day). */
export function isOpenAt(win: OpenWindow, min: number): boolean {
  return !!win && min >= win[0] && min < win[1];
}

/**
 * If it's closed at `min` but opens later the same day, the opening minute; else null
 * (open now, or closed for the rest of the day / no window at all).
 */
export function opensLaterToday(win: OpenWindow, min: number): number | null {
  return win && min < win[0] ? win[0] : null;
}

/**
 * The library's "typical" operating envelope — the widest [earliest open, latest close]
 * across every returned day. Used to REPAIR today's window: LibCal only returns FUTURE
 * slots, so today's returned window starts at ~now, not the real opening (a 24h library
 * loaded at 9pm looks like it "opens at 9pm"). null when no day has a window.
 */
export function typicalWindow(wins: OpenWindow[]): OpenWindow {
  let start = Infinity;
  let end = -Infinity;
  for (const w of wins) {
    if (!w) continue;
    if (w[0] < start) start = w[0];
    if (w[1] > end) end = w[1];
  }
  return Number.isFinite(start) && end > start ? [start, end] : null;
}

/**
 * The window to DISPLAY/decide-open-status for a date. Future days are returned whole, so
 * they pass through. TODAY's start is unreliable (past slots omitted → it starts at ~now),
 * so when the library is ALREADY open now we restore the real opening from `typical`. We
 * only ever widen the START (the END — future slots — is accurate); if the returned start
 * is still in the future it's a genuine late/reduced open and is left alone.
 */
export function displayWindow(
  dayWin: OpenWindow,
  isToday: boolean,
  nowMin: number,
  typical: OpenWindow,
): OpenWindow {
  if (!dayWin || !isToday || !typical) return dayWin;
  if (dayWin[0] <= nowMin && typical[0] < dayWin[0]) return [typical[0], dayWin[1]];
  return dayWin;
}
