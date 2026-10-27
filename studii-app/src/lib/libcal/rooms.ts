// Real Columbia LibCal identifiers. Single place that maps our domain rooms to
// LibCal space/location ids. (Verified against the live system.)

import type { Library } from "@/domain/types";

export const BUTLER: Library = {
  slug: "butler",
  name: "Butler Library",
  lid: 14585,
  floorLabel: "Floor 4 — Group Study",
  rooms: [
    { id: "403A", cap: 8, spaceId: 116915 },
    { id: "404", cap: 6, spaceId: 116916 },
    { id: "405", cap: 6, spaceId: 116917 },
    { id: "407", cap: 4, spaceId: 116918 },
    { id: "408", cap: 6, spaceId: 116919 },
    { id: "409A", cap: 8, spaceId: 116920 },
  ],
};

// Other CU library location ids — reference for future expansion (not yet in scope).
export const LIBRARY_LIDS = {
  butler: 14585,
  urisBusiness: 14596,
  lehman: 14594,
  scienceEng: 14595,
  socialWork: 14878,
} as const;

export const LIBRARIES: Library[] = [BUTLER];

export const getLibrary = (slug: string): Library | undefined =>
  LIBRARIES.find((l) => l.slug === slug);

export const getRoom = (slug: string, roomId: string) =>
  getLibrary(slug)?.rooms.find((r) => r.id === roomId);
