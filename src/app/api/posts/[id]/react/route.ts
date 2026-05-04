import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/posts/[id]/react — toggle a reaction
 * Body: { emoji? } — defaults to 👍
 *
 * If the user already reacted to this post, their reaction is removed (toggle).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const emoji = body.emoji ?? "👍";

  const supabase = await getSupabaseClient();

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("reactions")
    .select("post_id")
    .eq("post_id", id)
    .eq("user_id", result.user.id)
    .maybeSingle();

  if (existing) {
    // Remove existing reaction (toggle off)
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("post_id", id)
      .eq("user_id", result.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ action: "removed" });
  }

  // Add reaction
  const { error } = await supabase.from("reactions").insert({
    post_id: id,
    user_id: result.user.id,
    emoji,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ action: "added", emoji }, { status: 201 });
}
