import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/listings/[id]/save — Save a listing
 */
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id: listingId } = await ctx.params;
  const userId = result.user.id;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID format." }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("saved_listings")
    .insert({
      user_id: userId,
      listing_id: listingId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") { // Unique constraint violation (already saved)
      return NextResponse.json({ message: "Already saved." }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, data }, { status: 201 });
}

/**
 * DELETE /api/listings/[id]/save — Unsave a listing
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id: listingId } = await ctx.params;
  const userId = result.user.id;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID format." }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ unsaved: true });
}
