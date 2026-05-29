import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/listings/saved — Fetch saved listing IDs for current user
 */
export async function GET(_req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const userId = result.user.id;
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const savedIds = data?.map(d => d.listing_id) ?? [];
  return NextResponse.json({ savedIds });
}
