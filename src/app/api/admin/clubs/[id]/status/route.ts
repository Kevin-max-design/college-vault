import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH /api/admin/clubs/[id]/status
 * HOD/Principal opens or closes club registration.
 * Body: { is_open: true } or { is_open: false }
 * Optionally: { semester_label: "2025-26 Sem 1" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(["hod", "principal"]);
  if (result.error) return result.error;
  const { id: clubId } = await params;

  const body = await req.json();

  if (typeof body.is_open !== "boolean") {
    return NextResponse.json(
      { error: "is_open (boolean) is required." },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = {
    is_open: body.is_open,
    updated_at: new Date().toISOString(),
  };

  if (body.semester_label && typeof body.semester_label === "string") {
    updatePayload.semester_label = body.semester_label;
  }

  const { error } = await supabaseAdmin
    .from("clubs")
    .update(updatePayload)
    .eq("id", clubId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: body.is_open
      ? "Club registration opened."
      : "Club registration closed.",
  });
}
