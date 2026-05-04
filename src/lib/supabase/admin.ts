import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — uses the SERVICE_ROLE key so it
 * bypasses RLS.  Use ONLY in server-side API routes.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
