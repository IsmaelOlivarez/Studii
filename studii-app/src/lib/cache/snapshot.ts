// Shared availability cache — the heart of the data strategy. SERVER-SIDE ONLY.
//
// Reads ALWAYS return the cached snapshot instantly. A refresh is triggered only
// when the cache is older than CACHE_TTL_MS, and is guarded by a lock so that
// many simultaneous users cause AT MOST ONE LibCal refresh (coalescing). On a
// failed poll we keep the last-good snapshot.
//
//   getSnapshot(slug)      -> cached snapshot (+ fire-and-forget revalidate if stale)
//   refreshSnapshot(slug)  -> fetchGrid -> normalizeGrid -> persist (lock-guarded)
//
// CURRENT BACKEND: in-process module state. The cache + lock live in the Node
// server's memory, which is enough for dev and a single-instance demo (lost on
// restart, not shared across instances). The Supabase-backed version swaps the
// store + lock below WITHOUT changing these two function signatures, so nothing
// upstream (API route, components) has to change.

import { fetchGrid } from "@/lib/libcal/client";
import { normalizeGrid } from "@/lib/libcal/normalize";
import { getLibrary } from "@/lib/libcal/rooms";
import { ymd } from "@/lib/time/date";
import { CACHE_TTL_MS } from "@/domain/constants";
import type { AvailabilitySnapshot } from "@/domain/types";

/** How many days ahead to pull in one grid call (one call serves every date). */
const WINDOW_DAYS = 7;

interface Entry {
  snap: AvailabilitySnapshot;
  at: number; // Date.now() when fetched
}

// Last-good snapshot per library slug.
const cache = new Map<string, Entry>();
// In-flight refresh per slug — the coalescing lock. Concurrent callers share it.
const inFlight = new Map<string, Promise<AvailabilitySnapshot>>();

const isStale = (e: Entry) => Date.now() - e.at > CACHE_TTL_MS;

export async function getSnapshot(
  librarySlug: string,
): Promise<AvailabilitySnapshot | null> {
  const entry = cache.get(librarySlug);

  // Cold cache: must wait for the first real fetch.
  if (!entry) {
    try {
      return await refreshSnapshot(librarySlug);
    } catch (err) {
      console.error(`[cache] cold refresh failed for ${librarySlug}:`, err);
      return null;
    }
  }

  // Warm but stale: serve last-good now, revalidate in the background (coalesced).
  if (isStale(entry)) {
    refreshSnapshot(librarySlug).catch((err) =>
      console.error(`[cache] background refresh failed for ${librarySlug}:`, err),
    );
  }
  return entry.snap;
}

export async function refreshSnapshot(
  librarySlug: string,
): Promise<AvailabilitySnapshot> {
  // Coalesce: if a refresh is already running, everyone awaits the same promise.
  const existing = inFlight.get(librarySlug);
  if (existing) return existing;

  const library = getLibrary(librarySlug);
  if (!library) throw new Error(`Unknown library slug: ${librarySlug}`);

  const run = (async (): Promise<AvailabilitySnapshot> => {
    try {
      const slots = await fetchGrid(library.lid, ymd(0), ymd(WINDOW_DAYS));
      const snap = normalizeGrid(slots, library);
      cache.set(librarySlug, { snap, at: Date.now() });
      return snap;
    } catch (err) {
      // Keep last-good on failure; only surface the error if we have nothing.
      const last = cache.get(librarySlug);
      if (last) {
        console.error(`[cache] refresh failed for ${librarySlug}, serving last-good:`, err);
        return last.snap;
      }
      throw err;
    } finally {
      inFlight.delete(librarySlug);
    }
  })();

  inFlight.set(librarySlug, run);
  return run;
}
