// Pure availability math. No I/O — operates on BusyRange[] (minutes-from-midnight).
// Ported and typed from the smoke-and-mirrors prototype.

import { DAY_END, MAX_DURATION, SLOT_MINUTES } from "@/domain/constants";
import type { BusyRange, RoomStatus } from "@/domain/types";

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

/** First booked minute at/after `from` (how long a free room stays free). */
export function openUntil(busy: BusyRange[], from: number): number {
  for (let t = from; t < DAY_END; t += SLOT_MINUTES) if (busyAt(busy, t)) return t;
  return DAY_END;
}

export function statusAt(busy: BusyRange[], min: number): RoomStatus {
  if (busyAt(busy, min)) return "full";
  return openUntil(busy, min) - min <= 30 ? "limited" : "free";
}

/** Longest bookable duration from `from`: min(2h, time until next booking). */
export function maxBookable(busy: BusyRange[], from: number): number {
  return Math.min(MAX_DURATION, openUntil(busy, from) - from);
}

/** How many rooms are free at `min`. */
export function freeCount(rooms: { busy: BusyRange[] }[], min: number): number {
  return rooms.filter((r) => !busyAt(r.busy, min)).length;
}
