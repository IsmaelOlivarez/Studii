// Booking handoff. No auto-booking (needs UNI/SSO + off-limits to bots) — we
// deep-link the user to the room's live LibCal page, where they log in and confirm.
//
// Pre-selects room + date + START TIME: LibCal's `date` param accepts a datetime
// (`YYYY-MM-DDTHH:MM:SS`) and pre-selects that start slot in the booking widget
// (verified 2026-10-27). Duration/end CANNOT be deep-linked (`&end=` is ignored;
// LibCal defaults to a 30-min end) — the user adjusts the end dropdown to match
// the duration they picked here. A bare `YYYY-MM-DD` defaults to a midnight slot,
// so always pass the time when we have one.

import { getLibrary, getRoom } from "@/lib/libcal/rooms";
import type { DateISO, RoomId } from "@/domain/types";

// The LibCal space page lives on the SAME tenant we fetch availability from, so the
// deep-link host must track the library's `host` (Barnard is a separate tenant).
const DEFAULT_HOST = "seats.library.columbia.edu";
const spaceBase = (host: string) => `https://${host}/space/`;

const hhmmss = (min: number) => {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}:00`;
};

export function libcalDeepLink(
  librarySlug: string,
  roomId: RoomId,
  date: DateISO,
  startMin?: number, // minutes-from-midnight of the chosen start; pre-selects the slot
): string {
  const room = getRoom(librarySlug, roomId);
  if (!room) throw new Error(`unknown room ${librarySlug}/${roomId}`);
  const host = getLibrary(librarySlug)?.host ?? DEFAULT_HOST;
  const dateParam =
    startMin == null ? date : `${date}T${hhmmss(startMin)}`;
  return `${spaceBase(host)}${room.spaceId}?date=${encodeURIComponent(dateParam)}`;
}
