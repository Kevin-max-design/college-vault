import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/classrooms/[id] — full classroom detail
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("classrooms")
    .select(`
      *,
      classroom_members(user_id, role, joined_at, profiles(id, full_name, avatar_url)),
      posts(count)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/classrooms/[id] — update classroom
 * Body: { name?, description?, subject_type? }
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  const body = await req.json();

  const allowed = ["name", "description", "subject_type"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  // RLS enforces: only creator or hod/principal can update
  const { data, error } = await supabase
    .from("classrooms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
