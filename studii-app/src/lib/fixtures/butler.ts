// DEV fixture — fake Butler availability in the real AvailabilitySnapshot shape.
// Swapped for live Supabase data in a later step; nothing else changes.
// Edit a pattern's ranges to flip rooms open/booked (Wizard-of-Oz lever).

import type { AvailabilitySnapshot, RoomAvailability } from "@/domain/types";
import { BUTLER } from "@/lib/libcal/rooms";
import { toMin } from "@/lib/time/slots";
import { ymd } from "@/lib/time/date";

type RawDay = Record<string, [string, string][]>;

const PATTERNS: RawDay[] = [
  {
    // packed (midterms)
    "403A": [["09:00", "11:00"], ["13:00", "16:30"], ["18:00", "20:00"]],
    "404": [["08:00", "10:00"], ["12:00", "14:30"], ["17:00", "23:00"]],
    "405": [["10:00", "12:00"], ["15:00", "16:30"], ["20:00", "22:00"]],
    "407": [["09:00", "21:00"]],
    "408": [["08:30", "09:30"], ["11:00", "13:30"], ["19:00", "24:00"]],
    "409A": [["08:00", "12:00"], ["14:00", "18:00"], ["21:00", "23:00"]],
  },
  {
    // medium
    "403A": [["10:00", "13:00"], ["16:00", "18:00"]],
    "404": [["09:00", "11:30"], ["15:00", "17:00"]],
    "405": [["13:00", "15:00"]],
    "407": [["08:00", "10:00"], ["12:00", "14:00"], ["18:00", "20:00"]],
    "408": [["11:00", "12:00"], ["20:00", "22:00"]],
    "409A": [["09:00", "12:00"], ["17:00", "19:00"]],
  },
  {
    // light
    "403A": [["14:00", "16:00"]],
    "404": [["10:00", "11:00"], ["19:00", "21:00"]],
    "405": [["09:00", "10:30"]],
    "407": [["13:00", "15:00"]],
    "408": [["16:00", "18:00"]],
    "409A": [["11:00", "12:00"]],
  },
];

function toRoomAvail(raw: RawDay): RoomAvailability[] {
  return BUTLER.rooms.map((r) => ({
    roomId: r.id,
    busy: (raw[r.id] ?? []).map(([a, b]) => [toMin(a), toMin(b)] as [number, number]),
  }));
}

/** Butler snapshot for the next `n` days (cycles the 3 patterns). */
export function butlerFixture(n = 5): AvailabilitySnapshot {
  const days: AvailabilitySnapshot["days"] = {};
  for (let i = 0; i < n; i++) days[ymd(i)] = toRoomAvail(PATTERNS[i % PATTERNS.length]);
  return { librarySlug: BUTLER.slug, fetchedAt: new Date().toISOString(), days };
}
