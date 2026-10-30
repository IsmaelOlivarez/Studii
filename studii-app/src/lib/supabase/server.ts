// Server Supabase client — for the refresh/poller path and privileged reads/writes.
// Uses the service-role key (server-only; never expose to the browser). Created
// lazily so a build without env vars doesn't crash — it only throws when actually
// used at request time.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
