// Booking handoff. No auto-booking (needs UNI/SSO + off-limits to bots) — we
// deep-link the user to the room's live LibCal page for the chosen date, where
// they log in and confirm. Reliably pre-selects room + date (not the timeslot).

import { getRoom } from "@/lib/libcal/rooms";
import type { DateISO, RoomId } from "@/domain/types";

const SPACE_BASE = "https://seats.library.columbia.edu/space/";

export function libcalDeepLink(
  librarySlug: string,
  roomId: RoomId,
  date: DateISO,
): string {
  const room = getRoom(librarySlug, roomId);
  if (!room) throw new Error(`unknown room ${librarySlug}/${roomId}`);
  return `${SPACE_BASE}${room.spaceId}?date=${date}`;
}
