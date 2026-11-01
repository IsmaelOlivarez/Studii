// Transforms raw LibCal grid slots into our domain AvailabilitySnapshot.
//
//   1. map each slot's itemId (spaceId) -> our RoomId via the library's room list
//   2. bucket by date (YYYY-MM-DD, from the slot's start)
//   3. a 15-min slot is FREE iff it has NO className; ANY className present means
//      BUSY — "s-lc-eq-checkout" (the slot is checked out / booked) and
//      "s-lc-eq-r-unavailable" (otherwise unavailable) both render RED on LibCal.
//      (Verified 2026-10-27 against LibCal's own rendered grid: no-className cells
//      are the green "Available" ones; see §4 of CONTEXT.md.)
//   4. merge contiguous busy slots into BusyRange [startMin, endMin] tuples
//
// IMPORTANT — "returned but free" vs "not returned at all":
//   A date is emitted iff LibCal returned AT LEAST ONE slot for it (available or
//   busy). When it returns a full grid with zero bookings, that day is genuinely
//   ALL-FREE and must appear (every room, empty busy) — NOT be dropped. But LibCal
//   sometimes returns NO slots for a whole day (verified 2026-10-31: Uris on some
//   dates comes back `{"slots":[]}` even on a direct request). Those days stay
//   ABSENT from `days`, and the UI MUST treat a missing date as "no data / unknown"
//   — never as free/available. Absence of a slot within a RETURNED day = free;
//   absence of the whole day = closed.
//
//   5. each emitted day also carries `open` = [earliest slot start, latest slot end].
//      This IS the day's operating window — LibCal only returns cells inside the
//      bookable hours, so reduced hours / holiday closures fall out for free. The app
//      reads hours from here, not from a hardcoded table.

import type { GridSlot } from "./client";
import type {
  AvailabilitySnapshot,
  BusyRange,
  DayAvailability,
  Library,
} from "@/domain/types";

/** "YYYY-MM-DD HH:MM:SS" -> minutes-from-midnight of that timestamp's day. */
function minsOfDay(ts: string): number {
  const h = Number(ts.slice(11, 13));
  const m = Number(ts.slice(14, 16));
  return h * 60 + m;
}

/** Merge sorted, possibly-contiguous [start,end) busy slots into ranges. */
function mergeRanges(slots: BusyRange[]): BusyRange[] {
  if (slots.length === 0) return [];
  slots.sort((a, b) => a[0] - b[0]);
  const out: BusyRange[] = [slots[0]];
  for (let i = 1; i < slots.length; i++) {
    const last = out[out.length - 1];
    const [s, e] = slots[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e); // touching/overlapping -> extend
    else out.push([s, e]);
  }
  return out;
}

export function normalizeGrid(
  slots: GridSlot[],
  library: Library,
): AvailabilitySnapshot {
  const roomIdOf = new Map<number, string>(
    library.rooms.map((r) => [r.spaceId, r.id]),
  );

  // Per date LibCal returned a slot for (available OR busy): its open window (the span
  // of returned slots = the day's real bookable hours, reduced/holiday included) and
  // each room's busy ranges. Days LibCal didn't return stay absent → closed.
  const openOf = new Map<string, [number, number]>(); // date -> [minStart, maxEnd]
  const byDate = new Map<string, Map<string, BusyRange[]>>(); // date -> roomId -> busy

  for (const slot of slots) {
    const date = slot.start.slice(0, 10);
    const startMin = minsOfDay(slot.start);
    // A slot ending at next-day 00:00 is "end of this day" -> 1440.
    const endMin = slot.end.slice(0, 10) !== date ? 24 * 60 : minsOfDay(slot.end);

    // Widen the day's open window to cover every returned cell (available or busy).
    const w = openOf.get(date);
    if (!w) openOf.set(date, [startMin, endMin]);
    else {
      if (startMin < w[0]) w[0] = startMin;
      if (endMin > w[1]) w[1] = endMin;
    }

    const roomId = roomIdOf.get(slot.itemId);
    if (!roomId) continue; // a space we don't track
    if (!slot.className) continue; // no className = AVAILABLE -> not busy

    let rooms = byDate.get(date);
    if (!rooms) byDate.set(date, (rooms = new Map()));
    const list = rooms.get(roomId) ?? [];
    list.push([startMin, endMin]);
    rooms.set(roomId, list);
  }

  const days: AvailabilitySnapshot["days"] = {};
  for (const date of [...openOf.keys()].sort()) {
    const rooms = byDate.get(date); // undefined → a day with zero bookings (all free)
    days[date] = {
      open: openOf.get(date)!,
      // Always emit every tracked room (empty busy = fully open within the window).
      rooms: library.rooms.map((r) => ({
        roomId: r.id,
        busy: mergeRanges(rooms?.get(r.id) ?? []),
      })),
    } satisfies DayAvailability;
  }

  return {
    librarySlug: library.slug,
    fetchedAt: new Date().toISOString(),
    days,
  };
}
