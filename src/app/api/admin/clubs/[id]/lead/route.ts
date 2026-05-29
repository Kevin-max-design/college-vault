import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH /api/admin/clubs/[id]/lead
 * HOD/Principal assigns a club lead.
 * Body: { lead_id: "uuid" } or { lead_id: null } to unassign
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(["hod", "principal"]);
  if (result.error) return result.error;
  const { id: clubId } = await params;

  const body = await req.json();
  const leadId = body.lead_id || null;

  // If assigning, verify the user exists
  if (leadId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", leadId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
  }

  const { error } = await supabaseAdmin
    .from("clubs")
    .update({ lead_id: leadId, updated_at: new Date().toISOString() })
    .eq("id", clubId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: leadId ? "Club lead assigned." : "Club lead unassigned.",
  });
}
