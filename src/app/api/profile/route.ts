import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/profile — returns the current user's profile
 */
export async function GET() {
  const result = await requireAuth();
  if (result.error) return result.error;

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", result.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/profile — update own profile fields
 * Body: { full_name?, college_id?, department?, year_of_study?, avatar_url? }
 */
export async function PATCH(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const body = await req.json();

  // Only allow safe fields to be updated
  const allowed = ["full_name", "college_id", "department", "year_of_study", "avatar_url"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", result.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
