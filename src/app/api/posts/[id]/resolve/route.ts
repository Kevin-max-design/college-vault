import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

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
    .select("id, author_id, resolved, classroom_id")
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

  // Notify the doubt author if someone else (e.g., faculty) resolved it
  try {
    if (post.author_id !== result.user.id) {
      await createNotification({
        userId: post.author_id,
        type: 'resolved',
        title: data.resolved ? 'Doubt Resolved ✓' : 'Doubt Reopened',
        body: `Your doubt has been marked as ${data.resolved ? 'resolved' : 'reopened'} by ${result.user.full_name}.`,
        link: `/classrooms/${data.classroom_id}/posts/${id}`,
        actorId: result.user.id,
        category: 'doubt_resolved',
        priority: 'normal',
        source: 'classroom',
      });
    }
  } catch (err) {
    console.error('Failed to dispatch doubt resolution notification:', err);
  }

  return NextResponse.json(data);
}
