import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/listings/requested — Fetch requested listing IDs for current user
 */
export async function GET(_req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const userId = result.user.id;
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("listing_requests")
    .select("listing_id")
    .eq("requester_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requestedIds = data?.map(d => d.listing_id) ?? [];
  return NextResponse.json({ requestedIds });
}
