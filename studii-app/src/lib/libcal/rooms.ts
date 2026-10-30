// Real Columbia LibCal identifiers. Single place that maps our domain rooms to
// LibCal space/location ids. (Verified against the live system.)

import type { Library, WeeklyHours } from "@/domain/types";

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
// Uris building hours (term-time, looked up once from Columbia's hours page
// 2026-10-30: hours.library.columbia.edu/locations/business). Indexed Sun…Sat.
// Mon–Thu close at 3am (= 1620 min, past midnight); Fri–Sun close earlier.
const H = (openH: number, openM: number, closeH: number, closeM: number) => ({
  open: openH * 60 + openM,
  close: closeH * 60 + closeM,
});
const URIS_HOURS: WeeklyHours = [
  H(11, 0, 22, 0), // Sun 11:00am – 10:00pm
  H(9, 0, 27, 0), //  Mon 9:00am – 3:00am
  H(9, 0, 27, 0), //  Tue 9:00am – 3:00am
  H(9, 0, 27, 0), //  Wed 9:00am – 3:00am
  H(9, 0, 27, 0), //  Thu 9:00am – 3:00am
  H(9, 0, 19, 0), //  Fri 9:00am – 7:00pm
  H(10, 0, 18, 0), // Sat 10:00am – 6:00pm
];

export const URIS: Library = {
  slug: "uris",
  name: "Uris Library",
  shortName: "Uris",
  lid: 14596,
  floorLabel: "Ground & Mezzanine — Group Study",
  hours: URIS_HOURS,
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

// Other CU library location ids — reference for future expansion (not yet in scope).
export const LIBRARY_LIDS = {
  butler: 14585,
  urisBusiness: 14596,
  lehman: 14594,
  scienceEng: 14595,
  socialWork: 14878,
} as const;

export const LIBRARIES: Library[] = [BUTLER, URIS];

export const getLibrary = (slug: string): Library | undefined =>
  LIBRARIES.find((l) => l.slug === slug);

export const getRoom = (slug: string, roomId: string) =>
  getLibrary(slug)?.rooms.find((r) => r.id === roomId);
