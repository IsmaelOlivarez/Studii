// GET /api/availability?lib=butler
//
// The ONLY path through which clients get availability. It returns the cached,
// normalized snapshot for one library; the cache (lib/cache/snapshot) handles
// stale-while-revalidate + coalescing so many simultaneous callers cause at most
// one upstream LibCal refresh. Clients never call LibCal directly.

import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/cache/snapshot";
import { getLibrary } from "@/lib/libcal/rooms";

// Reading request searchParams below already opts this route out of prerendering
// (required under Next's Cache Components mode — no `export const dynamic` needed).
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("lib") ?? "butler";

  if (!getLibrary(slug)) {
    return NextResponse.json({ error: `Unknown library: ${slug}` }, { status: 404 });
  }

  const snapshot = await getSnapshot(slug);
  if (!snapshot) {
    // Cold cache + upstream failure: nothing to serve yet.
    return NextResponse.json(
      { error: "Availability temporarily unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json(snapshot, {
    // Allow a brief shared/CDN cache; the server cache already coalesces upstream.
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=90" },
  });
}
