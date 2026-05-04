import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/posts/[id]/resolve — toggle resolved status
 * Only the post author or faculty+ can resolve.
 */
export async function PATCH(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const supabase = await getSupabaseClient();

  // Fetch current post
  const { data: post, error: fetchErr } = await supabase
    .from("posts")
    .select("id, author_id, resolved")
    .eq("id", id)
    .single();

  if (fetchErr || !post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Only author or faculty+ can resolve
  const isAuthor = post.author_id === result.user.id;
  const isFacultyPlus = ["faculty", "hod", "principal"].includes(result.user.role);
  if (!isAuthor && !isFacultyPlus) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("posts")
    .update({ resolved: !post.resolved })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
