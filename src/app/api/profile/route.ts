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
  const allowed = [
    "full_name", 
    "college_id", 
    "department", 
    "year_of_study", 
    "avatar_url",
    "bio",
    "interests",
    "skills",
    "study_goals",
    "looking_for",
    "profile_visibility",
    "dm_privacy"
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  // Enforce tag counts capping to 10 on the backend
  const tagFields = ["interests", "skills", "study_goals", "looking_for"];
  for (const field of tagFields) {
    if (updates[field] !== undefined) {
      if (!Array.isArray(updates[field])) {
        return NextResponse.json({ error: `${field} must be an array of tags.` }, { status: 400 });
      }
      updates[field] = (updates[field] as string[])
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 10);
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
