// Pure availability math. No I/O — operates on BusyRange[] (minutes-from-midnight).
// Ported and typed from the smoke-and-mirrors prototype.

import { DAY_END, MAX_DURATION, MIN_DURATION, SLOT_MINUTES } from "@/domain/constants";
import type { BusyRange, RoomStatus } from "@/domain/types";
import type { OpenHours } from "./hours";

// `cap` throughout = the latest minute still bookable — the library's close time for
// the date (clamped to DAY_END; always-open libraries pass DAY_END, a no-op). It bounds
// "how long a room stays free" exactly like the next booking does, so a room that can't
// fit MIN_DURATION before close reads as unavailable, not free.

/** "HH:MM" -> minutes from midnight. */
export const toMin = (hhmm: string): number =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function busyAt(busy: BusyRange[], min: number): boolean {
  return busy.some(([a, b]) => min >= a && min < b);
}

/** First free minute at/after `from`, or null if booked for the rest of the day. */
export function nextOpen(busy: BusyRange[], from: number): number | null {
  for (let t = from; t < DAY_END; t += SLOT_MINUTES) if (!busyAt(busy, t)) return t;
  return null;
}

/** First booked minute at/after `from`, bounded by `cap` (close time): how long a
 *  free room stays bookable before it's taken or the library closes. */
export function openUntil(busy: BusyRange[], from: number, cap: number = DAY_END): number {
  for (let t = from; t < cap; t += SLOT_MINUTES) if (busyAt(busy, t)) return t;
  return cap;
}

export function statusAt(busy: BusyRange[], min: number, cap: number = DAY_END): RoomStatus {
  if (busyAt(busy, min)) return "full";
  const free = openUntil(busy, min, cap) - min;
  if (free < MIN_DURATION) return "full"; // can't fit a 30-min booking → unavailable
  return free <= 30 ? "limited" : "free";
}

/** Can a minimum booking (MIN_DURATION) start at `min` — not busy, and ≥30 min of free
 *  time before the next booking or close. This is the real "available" predicate. */
export function bookableAt(busy: BusyRange[], min: number, cap: number = DAY_END): boolean {
  return !busyAt(busy, min) && openUntil(busy, min, cap) - min >= MIN_DURATION;
}

/** Longest bookable duration from `from`: min(2h, time until next booking or close). */
export function maxBookable(busy: BusyRange[], from: number, cap: number = DAY_END): number {
  return Math.min(MAX_DURATION, openUntil(busy, from, cap) - from);
}

/** How many rooms can actually be booked at `min` (accounts for close via `cap`). */
export function freeCount(rooms: { busy: BusyRange[] }[], min: number, cap: number = DAY_END): number {
  return rooms.filter((r) => bookableAt(r.busy, min, cap)).length;
}

/**
 * The soonest grid-aligned minute at/after `from` when ≥1 room becomes bookable,
 * honoring the day's open INTERVALS (empty → closed all day → null). Each interval is
 * scanned with its own close as the cap, so a room must fit MIN_DURATION before that
 * interval ends — and minutes in a closed GAP between intervals are never offered.
 * Returns null if nothing frees up (or reopens) the rest of the day. This powers the
 * "so when CAN I get a room?" answer when 0 are open now.
 */
export function nextFreeMinute(
  rooms: { busy: BusyRange[] }[],
  from: number,
  hours: OpenHours,
): number | null {
  for (const [openStart, closeMin] of hours) {
    if (closeMin <= from) continue; // interval already fully in the past
    // Snap the search start up to the grid so the result lands on a clean slot boundary
    // (a booking ends at :00/:15/:30/:45), giving a tidy "frees at 6:00pm" label.
    let t = Math.ceil(Math.max(from, openStart) / SLOT_MINUTES) * SLOT_MINUTES;
    for (; t < closeMin; t += SLOT_MINUTES) {
      if (rooms.some((r) => bookableAt(r.busy, t, closeMin))) return t;
    }
  }
  return null;
}
