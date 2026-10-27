// Domain constants shared across the app.

export const DAY_START = 8 * 60; // 08:00 — first bookable minute shown
export const DAY_END = 24 * 60; // 24:00 — end of the day window
export const SLOT_MINUTES = 15; // LibCal grid granularity

export const MAX_DURATION = 120; // rooms are bookable up to 2 hours
export const DURATION_OPTIONS = [30, 60, 90, 120] as const; // minutes

// Stale-while-revalidate window for the cached snapshot (see lib/cache).
export const CACHE_TTL_MS = 90_000;
