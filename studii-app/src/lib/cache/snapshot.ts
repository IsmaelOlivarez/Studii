// Shared availability cache — the heart of the data strategy. SERVER-SIDE ONLY.
//
// BACKEND: Supabase (Postgres). A scheduled poller (pg_cron → POST /api/refresh,
// ~every 60s) calls `refreshAll`, which fetches LibCal once per library and upserts
// the normalized snapshot into `availability_snapshot`. Reads (`getSnapshot`) just
// return the latest stored row — they NEVER hit LibCal — so LibCal is polled at a
// fixed cadence by exactly one actor, no matter how much client traffic there is.
//
//   getSnapshot(slug)   -> latest stored snapshot (read-only; null if not yet written)
//   refreshSnapshot(slug)-> fetchGrid -> normalizeGrid -> upsert (poller only)
//   refreshAll()        -> refresh every library; used by /api/refresh
//
// `getSnapshot` keeps the same signature as the old in-process cache, so the API
// route and every component upstream are unchanged.

import { fetchGrid } from "@/lib/libcal/client";
import { normalizeGrid } from "@/lib/libcal/normalize";
import { getLibrary, LIBRARIES } from "@/lib/libcal/rooms";
import { ymd } from "@/lib/time/date";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AvailabilitySnapshot } from "@/domain/types";

const TABLE = "availability_snapshot";
/** How many days ahead to pull in one grid call (one call serves every date). */
const WINDOW_DAYS = 7;

/** Latest stored snapshot for a library, or null if the poller hasn't written one yet. */
export async function getSnapshot(
  librarySlug: string,
): Promise<AvailabilitySnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("data")
    .eq("slug", librarySlug)
    .maybeSingle();

  if (error) {
    console.error(`[cache] read failed for ${librarySlug}:`, error.message);
    return null;
  }
  return (data?.data as AvailabilitySnapshot | undefined) ?? null;
}

/** Poll LibCal for one library and upsert the normalized snapshot. Poller only. */
export async function refreshSnapshot(
  librarySlug: string,
): Promise<AvailabilitySnapshot> {
  const library = getLibrary(librarySlug);
  if (!library) throw new Error(`Unknown library slug: ${librarySlug}`);

  const slots = await fetchGrid(library.lid, ymd(0), ymd(WINDOW_DAYS));
  const snap = normalizeGrid(slots, library);

  const { error } = await supabaseAdmin()
    .from(TABLE)
    .upsert({ slug: librarySlug, data: snap, fetched_at: new Date().toISOString() });
  if (error) throw new Error(`upsert ${librarySlug}: ${error.message}`);

  return snap;
}

export interface RefreshResult {
  slug: string;
  ok: boolean;
  error?: string;
}

/** Refresh every known library; never throws — reports per-library success. */
export async function refreshAll(): Promise<RefreshResult[]> {
  return Promise.all(
    LIBRARIES.map(async (lib): Promise<RefreshResult> => {
      try {
        await refreshSnapshot(lib.slug);
        return { slug: lib.slug, ok: true };
      } catch (err) {
        console.error(`[cache] refresh failed for ${lib.slug}:`, err);
        return { slug: lib.slug, ok: false, error: String(err) };
      }
    }),
  );
}
