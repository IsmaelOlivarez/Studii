// POST /api/refresh  (Authorization: Bearer <REFRESH_SECRET>)
//
// The single poller entry point. A scheduler (Supabase pg_cron → pg_net) hits this
// ~every 60s; it fetches LibCal once per library and upserts the normalized snapshot
// into Supabase. Protected by a shared secret so only the scheduler can trigger it.
// Reads (/api/availability) never poll LibCal — they only read what this writes.

import { NextResponse } from "next/server";
import { refreshAll } from "@/lib/cache/snapshot";

export async function POST(req: Request) {
  const secret = process.env.REFRESH_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await refreshAll();
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 207 });
}
