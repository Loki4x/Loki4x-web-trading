import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client that bypasses Row Level Security using the service
// role key. NEVER import this from a Client Component, and never expose
// SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
//
// Used where there's no logged-in user session to work with, e.g. the
// Pakasir webhook (Pakasir's server calls it, not the browser).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service role belum dikonfigurasi (SUPABASE_SERVICE_ROLE_KEY belum diisi)");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

