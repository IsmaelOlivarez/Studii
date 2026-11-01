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

export interface Library {
  slug: string; // "butler"
  name: string; // "Butler Library"
  shortName: string; // "Butler" — compact label for tight UI (room sheet, chips)
  lid: number; // LibCal location id
  floorLabel: string; // "Floor 4 — Group Study"
  rooms: Room[];
  // NOTE: operating hours are NOT configured here. They're derived per-day from the
  // LibCal grid itself (see DayAvailability.open), which captures reduced hours,
  // closures, holidays and finals automatically. A day with no grid = closed.
}

/** A busy interval expressed in minutes-from-midnight, local time. */
export type BusyRange = [startMin: number, endMin: number];

/** Availability for one room on one date. */
export interface RoomAvailability {
  roomId: RoomId;
  busy: BusyRange[];
}

/** One library's availability for one date. Present in a snapshot IFF LibCal returned
 *  a grid for that day; a day with no grid is absent → treated as CLOSED (not free). */
export interface DayAvailability {
  /** Grid-derived open window `[startMin, endMin)` — the span of returned slots, i.e.
   *  the day's true bookable hours (reduced/holiday hours included). */
  open: [number, number];
  rooms: RoomAvailability[];
}

/** A cached snapshot for one library across a date window. */
export interface AvailabilitySnapshot {
  librarySlug: string;
  fetchedAt: string; // ISO timestamp of the poll that produced this
  days: Record<DateISO, DayAvailability>;
}

export type RoomStatus = "free" | "limited" | "full";
