// Shared availability cache — the heart of the data strategy.
//
// Reads ALWAYS return the cached snapshot instantly. A refresh is triggered only
// when the cache is older than CACHE_TTL_MS, and is guarded by a lock so that
// many simultaneous users cause AT MOST ONE LibCal refresh (coalescing). On a
// failed poll we keep the last-good snapshot.
//
//   getSnapshot(slug)      -> cached snapshot (+ fire-and-forget revalidate if stale)
//   refreshSnapshot(slug)  -> fetchGrid -> normalizeGrid -> persist (lock-guarded)
//
// Persistence + the lock live in Supabase Postgres (see lib/supabase). Clients
// subscribe via Supabase Realtime to get pushed updates when a refresh lands.

import type { AvailabilitySnapshot } from "@/domain/types";

export async function getSnapshot(
  _librarySlug: string,
): Promise<AvailabilitySnapshot | null> {
  // TODO(iteration-2): read from Supabase; if stale, kick coalesced refresh.
  throw new Error("getSnapshot not implemented yet");
}

export async function refreshSnapshot(
  _librarySlug: string,
): Promise<AvailabilitySnapshot> {
  // TODO(iteration-2): lock -> fetchGrid -> normalizeGrid -> upsert -> unlock.
  throw new Error("refreshSnapshot not implemented yet");
}
