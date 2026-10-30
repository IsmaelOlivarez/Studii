// Pure domain model. No framework or I/O imports — safe to use anywhere
// (client, server, edge, tests).

export type RoomId = string; // e.g. "405", "403A"
export type SpaceId = number; // LibCal space id, e.g. 116917
export type DateISO = string; // "YYYY-MM-DD" (local)

export interface Room {
  id: RoomId;
  cap: number;
  spaceId: SpaceId;
}

/** Open/close for one weekday, in minutes-from-midnight. `close` may exceed 1440
 *  (past midnight, e.g. a 3am close = 1620). `null` = closed all that day. */
export type DayHours = { open: number; close: number } | null;

/** Operating hours indexed by JS `Date.getDay()`: 0=Sun, 1=Mon, … 6=Sat. */
export type WeeklyHours = [
  DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours,
];

export interface Library {
  slug: string; // "butler"
  name: string; // "Butler Library"
  shortName: string; // "Butler" — compact label for tight UI (room sheet, chips)
  lid: number; // LibCal location id
  floorLabel: string; // "Floor 4 — Group Study"
  rooms: Room[];
  /** Building hours. Omit for always-open (e.g. Butler, 24h during term). Static
   *  term-time hours — holiday/break/finals specials are not tracked. */
  hours?: WeeklyHours;
}

/** A busy interval expressed in minutes-from-midnight, local time. */
export type BusyRange = [startMin: number, endMin: number];

/** Availability for one room on one date. */
export interface RoomAvailability {
  roomId: RoomId;
  busy: BusyRange[];
}

/** A cached snapshot for one library across a date window. */
export interface AvailabilitySnapshot {
  librarySlug: string;
  fetchedAt: string; // ISO timestamp of the poll that produced this
  days: Record<DateISO, RoomAvailability[]>;
}

export type RoomStatus = "free" | "limited" | "full";
