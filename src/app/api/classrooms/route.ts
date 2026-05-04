import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/classrooms?department=CSE&year=3
 * Returns classrooms with member count and post count.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const year = searchParams.get("year");
  const type = searchParams.get("type"); // study | project

  const supabase = await getSupabaseClient();
  let query = supabase
    .from("classrooms")
    .select(`
      *,
      classroom_members(count),
      posts(count)
    `)
    .order("created_at", { ascending: false });

  if (department) query = query.eq("department", department);
  if (year) query = query.eq("year", parseInt(year));
  if (type) query = query.eq("type", type);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten aggregate counts
  const classrooms = (data ?? []).map((c) => ({
    ...c,
    member_count: c.classroom_members?.[0]?.count ?? 0,
    post_count: c.posts?.[0]?.count ?? 0,
    classroom_members: undefined,
    posts: undefined,
  }));

  return NextResponse.json(classrooms);
}

/**
 * POST /api/classrooms — create a classroom
 * Body: { name, type?, subject_type?, department, year, description? }
 * Only faculty / hod / principal allowed.
 */
export async function POST(req: NextRequest) {
  const result = await requireRole(["faculty", "hod", "principal"]);
  if (result.error) return result.error;

  const body = await req.json();
  const { name, type, subject_type, department, year, description } = body;

  if (!name || !department || !year) {
    return NextResponse.json(
      { error: "name, department, and year are required." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("classrooms")
    .insert({
      name,
      type: type ?? "study",
      subject_type: subject_type ?? "core",
      department,
      year: parseInt(year),
      description: description ?? "",
      created_by: result.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-add creator as owner
  await supabase.from("classroom_members").insert({
    classroom_id: data.id,
    user_id: result.user.id,
    role: "owner",
  });

  return NextResponse.json(data, { status: 201 });
}
