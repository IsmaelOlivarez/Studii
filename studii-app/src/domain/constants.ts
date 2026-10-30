// Domain constants shared across the app.

export const DAY_START = 8 * 60; // 08:00 — first bookable minute shown
export const DAY_END = 24 * 60; // 24:00 — end of the day window
export const SLOT_MINUTES = 15; // LibCal grid granularity

export const MAX_DURATION = 120; // rooms are bookable up to 2 hours
export const DURATION_OPTIONS = [30, 60, 90, 120] as const; // minutes

// Stale-while-revalidate window for the cached snapshot (see lib/cache).
export const CACHE_TTL_MS = 90_000;

// Hard floor between real LibCal fetches per library. Even if /api/refresh is
// called more often than intended (misconfigured/doubled cron, or someone with the
// secret), the poller skips LibCal when the stored snapshot is younger than this —
// so LibCal is never hit more than ~once per this interval per library. Keep it
// below the cron cadence (we schedule the cron at ~2 min) so normal runs still refresh.
export const MIN_REFRESH_INTERVAL_MS = 100_000;
