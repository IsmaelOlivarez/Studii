// Real Columbia LibCal identifiers. Single place that maps our domain rooms to
// LibCal space/location ids. (Verified against the live system.)

import type { Library } from "@/domain/types";

export const BUTLER: Library = {
  slug: "butler",
  name: "Butler Library",
  shortName: "Butler",
  lid: 14585,
  campus: "morningside",
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
  campus: "morningside",
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
  campus: "morningside",
  floorLabel: "Floor 6 — Group Study",
  rooms: [
    { id: "605", cap: 8, spaceId: 116923 },
    { id: "606", cap: 8, spaceId: 116924 },
  ],
};

// Lehman Social Sciences Library — in the International Affairs Building (SIPA), the
// first live library on EAST CAMPUS (east of Amsterdam Ave, across the Law Bridge).
// Just TWO bookable group-study rooms on Floor 3 — 327.1 & 327.2, both capacity 8
// (verified live 2026-11-07 from the LibCal /spaces config: one group gid=30397
// "Study Rooms", eids 116921/116922). A `gid=0` grid for this building returns exactly
// these two, which `normalizeGrid` keeps via the spaceId filter. Hours derive per-day
// from the grid, as usual.
export const LEHMAN: Library = {
  slug: "lehman",
  name: "Lehman Social Sciences Library",
  shortName: "Lehman",
  lid: 14594,
  campus: "east-campus",
  floorLabel: "Floor 3 — Group Study",
  rooms: [
    { id: "327.1", cap: 8, spaceId: 116921 },
    { id: "327.2", cap: 8, spaceId: 116922 },
  ],
};

// Barnard Library — the Milstein Center for Teaching & Learning ("MLC"), the first
// live library on BARNARD's campus (west of Broadway). Barnard runs a SEPARATE
// Springshare LibCal tenant — barnard.libcal.com, NOT Columbia's seats.library host —
// so `host` is set and the grid POST + Referer target that origin (see client.fetchGrid).
// NINE bookable group-study rooms across three floors (verified live 2026-11-07 from the
// LibCal /reserve/study-rooms config: lid 8482, one group gid 15601 "Study Rooms"):
//   • Floor 1: MLC-112 (59792), MLC-118 (59793)
//   • Floor 2: MLC-226 (59958), MLC-227 (59959)
//   • Floor 3: MLC-314 (59960), MLC-315 (59962), MLC-323 (59799), MLC-324 (59963), MLC-325 (59964)
// A `gid=0` grid returns exactly these nine, which `normalizeGrid` keeps via the spaceId
// filter. Room ids carry the floor as their leading digit (1xx/2xx/3xx) so the floor plan's
// tiers split on it — like Uris's Ground/Mezzanine. Hours derive per-day from the grid.
export const MILSTEIN: Library = {
  slug: "milstein",
  name: "Barnard Library (Milstein Center)",
  shortName: "Milstein",
  lid: 8482,
  campus: "barnard",
  host: "barnard.libcal.com",
  floorLabel: "Milstein Center — Group Study",
  rooms: [
    { id: "112", cap: 3, spaceId: 59792 },
    { id: "118", cap: 3, spaceId: 59793 },
    { id: "226", cap: 2, spaceId: 59958 },
    { id: "227", cap: 2, spaceId: 59959 },
    { id: "314", cap: 3, spaceId: 59960 },
    { id: "315", cap: 4, spaceId: 59962 },
    { id: "323", cap: 2, spaceId: 59799 },
    { id: "324", cap: 2, spaceId: 59963 },
    { id: "325", cap: 2, spaceId: 59964 },
  ],
};

// Social Work Library — at the Columbia School of Social Work (1255 Amsterdam Ave,
// 121st–122nd), just north of SIPA across the Law Bridge → lives on the EAST CAMPUS map.
// TWO bookable group-study rooms on Floor 2 — 205 & 206, both capacity 6 (verified live
// 2026-11-09 from the LibCal grid + space pages: lid 14878, gid=0 returns exactly spaceIds
// 144817 (205) and 120571 (206); note the ids are NOT sequential, so they're listed
// explicitly). Columbia's standard tenant (no `host` override). `normalizeGrid` keeps the
// two via the spaceId filter; hours derive per-day from the grid, as usual.
export const SOCIAL_WORK: Library = {
  slug: "social-work",
  name: "Social Work Library",
  shortName: "Social Work",
  lid: 14878,
  campus: "east-campus",
  floorLabel: "Floor 2 — Group Study",
  rooms: [
    { id: "205", cap: 6, spaceId: 144817 },
    { id: "206", cap: 6, spaceId: 120571 },
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

export const LIBRARIES: Library[] = [BUTLER, URIS, SCIENCE_ENG, LEHMAN, MILSTEIN, SOCIAL_WORK];

export const getLibrary = (slug: string): Library | undefined =>
  LIBRARIES.find((l) => l.slug === slug);

export const getRoom = (slug: string, roomId: string) =>
  getLibrary(slug)?.rooms.find((r) => r.id === roomId);
