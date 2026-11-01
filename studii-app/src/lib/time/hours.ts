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
