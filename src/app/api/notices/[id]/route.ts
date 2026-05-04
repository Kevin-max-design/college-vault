import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notices/[id] — pin, archive, or update a notice
 * Body: { pinned?, archived?, title?, body?, tag? }
 *
 * Permissions:
 * - Author can update title/body/tag
 * - HOD can pin/archive dept notices
 * - Principal can do anything
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const body = await req.json();

  const supabase = await getSupabaseClient();

  // Fetch notice to check ownership
  const { data: notice, error: fetchErr } = await supabase
    .from("notices")
    .select("id, author_id, scope, department")
    .eq("id", id)
    .single();

  if (fetchErr || !notice) {
    return NextResponse.json({ error: "Notice not found." }, { status: 404 });
  }

  const isAuthor = notice.author_id === result.user.id;
  const isPrincipal = result.user.role === "principal";
  const isHOD = result.user.role === "hod";

  if (!isAuthor && !isPrincipal && !isHOD) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Build update object
  const allowed = ["pinned", "archived", "title", "body", "tag"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/notices/[id] — delete a notice
 * Only author or principal can delete.
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const supabase = await getSupabaseClient();

  // RLS handles the permission check (author or principal)
  const { error } = await supabase
    .from("notices")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted." });
}
