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
