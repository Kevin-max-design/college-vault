import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/classrooms/[id]/join — join a classroom
 * Body: { entry_code? } — optional if classroom is open
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const supabase = await getSupabaseClient();

  // Verify classroom exists
  const { data: classroom, error: clsErr } = await supabase
    .from("classrooms")
    .select("id, entry_code")
    .eq("id", id)
    .single();

  if (clsErr || !classroom) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  // Check entry code if classroom has one
  if (classroom.entry_code && body.entry_code !== classroom.entry_code) {
    return NextResponse.json(
      { error: "Invalid entry code." },
      { status: 403 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("classroom_members")
    .select("user_id")
    .eq("classroom_id", id)
    .eq("user_id", result.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Already a member." }, { status: 200 });
  }

  // Join
  const { error } = await supabase.from("classroom_members").insert({
    classroom_id: id,
    user_id: result.user.id,
    role: "member",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Joined successfully." }, { status: 201 });
}
