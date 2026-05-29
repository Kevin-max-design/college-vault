import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const supabase = await getSupabaseClient();

  // First fetch the post to see if the user is authorized to delete it (author or HOD/faculty/principal)
  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", id)
    .single();

  if (fetchError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Retrieve user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", result.user.id)
    .single();

  const isAuthor = post.author_id === result.user.id;
  const isMod = profile && ["faculty", "hod", "principal"].includes(profile.role);

  if (!isAuthor && !isMod) {
    return NextResponse.json({ error: "Unauthorized to delete this post" }, { status: 403 });
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted successfully." });
}
