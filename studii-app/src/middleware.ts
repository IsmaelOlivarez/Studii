// Edge middleware: per-IP rate limiting on EVERY request (pages + API routes).
//
// Counters live in Postgres (Supabase) via the `rl_hit` RPC — atomic + distributed,
// so the cap holds across all serverless instances (an in-memory counter would reset
// per instance and leak). We call it with a raw fetch using the service-role key
// rather than the supabase-js SDK, to keep the edge bundle small.
//
// FAIL-OPEN by design: if the limiter backend is unconfigured (local dev without env)
// or unreachable, requests are ALLOWED. A limiter hiccup must never take Studii down.
//
// The limits are flood caps, not fairness quotas — set high enough that no real user
// (including many students sharing one campus-NAT IP) ever trips them, low enough to
// stop a single-source flood. Distributed attacks are Vercel's platform job, not this.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Rule = { tag: string; limit: number; windowSecs: number };

// Per-route rule. Everything falls through to the page default.
function ruleFor(pathname: string): Rule {
  if (pathname.startsWith("/api/refresh")) return { tag: "refresh", limit: 30, windowSecs: 60 };
  if (pathname.startsWith("/api/availability")) return { tag: "avail", limit: 300, windowSecs: 60 };
  return { tag: "page", limit: 120, windowSecs: 60 };
}

// Client IP from the proxy headers Vercel sets. First hop of x-forwarded-for is the
// real client; fall back so a missing header can't collapse everyone into one bucket.
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function middleware(req: NextRequest) {
  // Not configured (e.g. local dev) → don't limit, don't break.
  if (!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const rule = ruleFor(pathname);
  const key = `${rule.tag}:${clientIp(req)}`;
  const isApi = pathname.startsWith("/api/");

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rl_hit`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        authorization: `Bearer ${SUPABASE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_key: key,
        p_limit: rule.limit,
        p_window_secs: rule.windowSecs,
      }),
    });

    // Limiter errored → fail open.
    if (!res.ok) return NextResponse.next();

    const rows = (await res.json()) as Array<{ allowed: boolean; reset_at: string }>;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || row.allowed) return NextResponse.next();

    // Over the limit → 429 with Retry-After (seconds until the window resets).
    const retry = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
    const headers = new Headers({ "retry-after": String(retry) });
    if (isApi) {
      headers.set("content-type", "application/json");
      return new NextResponse(JSON.stringify({ error: "rate_limited", retryAfter: retry }), {
        status: 429,
        headers,
      });
    }
    headers.set("content-type", "text/plain; charset=utf-8");
    return new NextResponse("Too many requests — give it a few seconds.", { status: 429, headers });
  } catch {
    // Network blip reaching the limiter → fail open rather than 500 the site.
    return NextResponse.next();
  }
}

// Gate pages + API, but skip static assets (CDN-served, pointless to count): Next's
// internals, the favicon, and anything with a static file extension.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|json|txt|xml|webmanifest)$).*)",
  ],
};
