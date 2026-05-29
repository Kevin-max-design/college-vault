import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH /api/club-lead/clubs/[id]/status
 * Club lead (or HOD/Principal) opens or closes registration for their assigned club.
 * Body: { is_open: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;
  const { id: clubId } = await params;

  // Verify authorization
  const isAdmin = user.role === "hod" || user.role === "principal";
  if (!isAdmin) {
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("lead_id")
      .eq("id", clubId)
      .single();

    if (!club || club.lead_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You are not the lead of this club." },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const isOpen = body.is_open;

  if (typeof isOpen !== "boolean") {
    return NextResponse.json({ error: "is_open boolean is required." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("clubs")
    .update({ is_open: isOpen, updated_at: new Date().toISOString() })
    .eq("id", clubId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: isOpen ? "Club registration is now open." : "Club registration is now closed.",
  });
}
