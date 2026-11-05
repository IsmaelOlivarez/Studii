// Real Columbia LibCal identifiers. Single place that maps our domain rooms to
// LibCal space/location ids. (Verified against the live system.)

import type { Library } from "@/domain/types";

export const BUTLER: Library = {
  slug: "butler",
  name: "Butler Library",
  shortName: "Butler",
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

// Uris Library — the Business & Economics group-study set. 34 bookable rooms over
// TWO floors (verified live 2026-10-28):
//   • Ground floor  (LibCal group gid=30480): G 01–G 17, spaceIds 117401–117417
//   • Mezzanine     (LibCal group gid=30483): M 01–M 17, spaceIds 117418–117434
// Every room is capacity 6. The building's `gid=0` grid returns all 34 in one call,
// and `normalizeGrid` filters to the spaceIds listed here. Room ids carry the floor
// prefix (G/M) — the floor plan splits the two tiers off that.
// Operating hours (incl. Uris's reduced/holiday hours) are derived per-day from the
// LibCal grid, not hardcoded here — see DayAvailability.open / normalize.ts.
export const URIS: Library = {
  slug: "uris",
  name: "Uris Library",
  shortName: "Uris",
  lid: 14596,
  floorLabel: "Ground & Mezzanine — Group Study",
  rooms: [
    ...Array.from({ length: 17 }, (_, i) => ({
      id: `G${String(i + 1).padStart(2, "0")}`, // G01 … G17 (ground)
      cap: 6,
      spaceId: 117401 + i, // 117401 … 117417
    })),
    ...Array.from({ length: 17 }, (_, i) => ({
      id: `M${String(i + 1).padStart(2, "0")}`, // M01 … M17 (mezzanine)
      cap: 6,
      spaceId: 117418 + i, // 117418 … 117434
    })),
  ],
};

// Science & Engineering Library — the Northwest Corner Building ("NoCo" to students).
// The smallest set of the three: just TWO bookable group-study rooms, 605 & 606, both
// capacity 8, on Floor 6 (verified live 2026-11-05). One LibCal group — gid=30398
// "Study Rooms" — and a `gid=0` grid for this building returns exactly these two spaces,
// which `normalizeGrid` keeps via the spaceId filter. spaceIds are sequential (116923,
// 116924), so `spaceId = 116923 + index`. Hours derive per-day from the grid, as usual.
export const SCIENCE_ENG: Library = {
  slug: "science-eng",
  name: "Science & Engineering Library",
  shortName: "NoCo",
  lid: 14595,
  floorLabel: "Floor 6 — Group Study",
  rooms: [
    { id: "605", cap: 8, spaceId: 116923 },
    { id: "606", cap: 8, spaceId: 116924 },
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

export const LIBRARIES: Library[] = [BUTLER, URIS, SCIENCE_ENG];

export const getLibrary = (slug: string): Library | undefined =>
  LIBRARIES.find((l) => l.slug === slug);

export const getRoom = (slug: string, roomId: string) =>
  getLibrary(slug)?.rooms.find((r) => r.id === roomId);
