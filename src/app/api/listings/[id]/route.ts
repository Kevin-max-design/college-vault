import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/listings/[id] — listing detail
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, department, email)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/listings/[id] — update listing status or details
 * Body: { status?, title?, description?, price?, images? }
 * Only the seller can update.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const body = await req.json();

  const allowed = ["status", "title", "description", "price", "images"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  // RLS ensures only seller can update
  const { data, error } = await supabase
    .from("listings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/listings/[id] — delete a listing
 * Only the seller can delete (enforced by RLS).
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted." });
}
