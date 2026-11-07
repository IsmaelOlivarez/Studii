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

/** Which swipeable campus map a library lives on (drives where its hero/card render). */
export type Campus = "morningside" | "barnard" | "east-campus";

export interface Library {
  slug: string; // "butler"
  name: string; // "Butler Library"
  shortName: string; // "Butler" — compact label for tight UI (room sheet, chips)
  lid: number; // LibCal location id
  campus: Campus; // which campus panel its map hero + summary card appear on
  /** Springshare LibCal host, e.g. "barnard.libcal.com". Omit for Columbia's tenant
   *  (seats.library.columbia.edu). Barnard is a SEPARATE tenant, so its grid POST +
   *  Referer must target its own origin — this selects it (see client.fetchGrid). */
  host?: string;
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
  /** Grid-derived OPEN INTERVALS `[startMin, endMin)[]` — contiguous runs of returned
   *  slots, i.e. the day's true bookable hours (reduced/holiday hours included). A library
   *  can close mid-day (e.g. a late-night tail then a daytime block), so this is a LIST of
   *  intervals with the closed gaps between them, never a single bridging span. Sorted,
   *  non-overlapping; empty only in the degenerate no-slot case (absent days are omitted). */
  open: [number, number][];
  rooms: RoomAvailability[];
}

/** A cached snapshot for one library across a date window. */
export interface AvailabilitySnapshot {
  librarySlug: string;
  fetchedAt: string; // ISO timestamp of the poll that produced this
  days: Record<DateISO, DayAvailability>;
}

export type RoomStatus = "free" | "limited" | "full";
