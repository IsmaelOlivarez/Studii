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
// The result is exactly the shape the UI already consumes from the fixture, so
// swapping live data in changes nothing downstream.

import type { GridSlot } from "./client";
import type {
  AvailabilitySnapshot,
  BusyRange,
  Library,
  RoomAvailability,
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

  // date -> roomId -> list of raw busy [startMin, endMin)
  const byDate = new Map<string, Map<string, BusyRange[]>>();

  for (const slot of slots) {
    const roomId = roomIdOf.get(slot.itemId);
    if (!roomId) continue; // a space we don't track
    if (!slot.className) continue; // no className = AVAILABLE -> not busy

    const date = slot.start.slice(0, 10);
    const startMin = minsOfDay(slot.start);
    // A slot ending at next-day 00:00 is "end of this day" -> 1440.
    const endMin = slot.end.slice(0, 10) !== date ? 24 * 60 : minsOfDay(slot.end);

    let rooms = byDate.get(date);
    if (!rooms) byDate.set(date, (rooms = new Map()));
    const list = rooms.get(roomId) ?? [];
    list.push([startMin, endMin]);
    rooms.set(roomId, list);
  }

  const days: AvailabilitySnapshot["days"] = {};
  for (const [date, rooms] of [...byDate.entries()].sort()) {
    // Always emit every tracked room (empty busy = fully open that day).
    days[date] = library.rooms.map<RoomAvailability>((r) => ({
      roomId: r.id,
      busy: mergeRanges(rooms.get(r.id) ?? []),
    }));
  }

  return {
    librarySlug: library.slug,
    fetchedAt: new Date().toISOString(),
    days,
  };
}
