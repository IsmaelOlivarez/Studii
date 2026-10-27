// Server Supabase client — for the refresh/poller path and any privileged writes.
// Uses the service-role key (server-only; never expose to the browser).
//
// TODO(iteration-2): implement once the Supabase project exists, e.g.
//
//   import { createClient } from "@supabase/supabase-js";
//   export const supabaseAdmin = createClient(
//     process.env.SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { persistSession: false } },
//   );

export {};
