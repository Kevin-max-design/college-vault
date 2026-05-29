import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isSeedId(id: string) { return !UUID_RE.test(id); }

/**
 * GET /api/classrooms/[id]/posts?type=doubt&parent_id=&page=1
 * Returns posts with author profile, reactions, and reply count.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  if (isSeedId(id)) return NextResponse.json({ posts: [], page: 1, limit: 20 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const parentId = searchParams.get("parent_id");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("posts")
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
      reactions(emoji, user_id),
      replies:posts!posts_parent_id_fkey(count)
    `)
    .eq("classroom_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by type
  if (type) query = query.eq("type", type);

  // Top-level posts only (no parent) by default, unless requesting replies
  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten reply count
  const posts = (data ?? []).map((p) => ({
    ...p,
    reply_count: p.replies?.[0]?.count ?? 0,
    replies: undefined,
  }));

  return NextResponse.json({ posts, page, limit });
}

/**
 * POST /api/classrooms/[id]/posts — create a post
 * Body: { content, type, attachments?, parent_id? }
 *
 * Role rules enforced at API layer:
 * - Students can post doubts & threads
 * - Faculty/HOD/Principal can post all types including materials & announcements
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  if (isSeedId(id)) {
    return NextResponse.json(
      { error: "This is a demo classroom. Log in and create a real classroom to post." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { content, type, attachments, parent_id } = body;

  if (!content || !type) {
    return NextResponse.json(
      { error: "content and type are required." },
      { status: 400 }
    );
  }

  // TODO: Migration Plan — Rename database post_type enum 'thread' -> 'reply'.
  // Currently, the database only supports 'thread' via the post_type enum constraint.
  // Once the database migration (supabase_thread_to_reply_migration_todo.sql) is executed,
  // we should completely search-and-replace 'thread' with 'reply' throughout the codebase.
  
  // Convert thread to doubt for backward compatibility (only for root posts)
  let finalType = type;
  if (!parent_id && finalType === "thread") {
    finalType = "doubt";
  }

  // Role-based type restriction
  const studentAllowed = ["doubt", "thread"];
  if (result.user.role === "student") {
    if (!studentAllowed.includes(finalType)) {
      return NextResponse.json(
        { error: "Students can only post doubts and replies." },
        { status: 403 }
      );
    }
    if (!parent_id && finalType !== "doubt") {
      return NextResponse.json(
        { error: "Students can only create root posts of type doubt." },
        { status: 403 }
      );
    }
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      classroom_id: id,
      author_id: result.user.id,
      content,
      type: finalType,
      attachments: attachments ?? [],
      parent_id: parent_id ?? null,
    })
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
