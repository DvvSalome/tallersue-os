import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. SERVER-ONLY — never import this from a Client
// Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser. Used only to
// create auth users with a synthetic (unconfirmed-by-design) email for the
// no-email participant/facilitador registration flow.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
