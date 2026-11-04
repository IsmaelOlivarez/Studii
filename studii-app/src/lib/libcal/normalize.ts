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
//   5. each emitted day also carries `open` = the OPEN INTERVALS, derived by merging every
//      returned slot's time range into contiguous runs. LibCal only returns cells inside
//      bookable hours, so reduced hours / holiday closures fall out for free — AND a within-
//      day closure (a gap with no returned slots, e.g. Uris 02:45–09:00) splits the day into
//      multiple intervals instead of being bridged by a single [min,max] span (which would
//      wrongly read the gap as open/free). The app reads hours from here, not a hardcoded
//      table.

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

  // Per date LibCal returned a slot for (available OR busy): every returned slot's time
  // range (→ merged into the day's OPEN INTERVALS, gaps = closed) and each room's busy
  // ranges. Days LibCal didn't return stay absent → closed.
  const openSlotsOf = new Map<string, BusyRange[]>(); // date -> every returned slot [start,end)
  const byDate = new Map<string, Map<string, BusyRange[]>>(); // date -> roomId -> busy

  for (const slot of slots) {
    const date = slot.start.slice(0, 10);
    const startMin = minsOfDay(slot.start);
    // A slot ending at next-day 00:00 is "end of this day" -> 1440.
    const endMin = slot.end.slice(0, 10) !== date ? 24 * 60 : minsOfDay(slot.end);

    // Collect every returned cell's span (available or busy) — merged below, their
    // contiguous runs ARE the open intervals; the gaps between runs are closed.
    const open = openSlotsOf.get(date) ?? [];
    open.push([startMin, endMin]);
    openSlotsOf.set(date, open);

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
  for (const date of [...openSlotsOf.keys()].sort()) {
    const rooms = byDate.get(date); // undefined → a day with zero bookings (all free)
    days[date] = {
      // Contiguous runs of returned slots = open intervals; gaps between them are closed.
      open: mergeRanges(openSlotsOf.get(date)!),
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
