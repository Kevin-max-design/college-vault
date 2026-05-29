import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH /api/club-lead/clubs/[id]/limits
 * Club lead (or HOD/Principal) sets limits for their assigned club.
 * Body: { limits: [{ year: number, max_slots: number }] }
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
  const limitsInput = body.limits as Array<{ year: number; max_slots: number }>;

  if (!Array.isArray(limitsInput) || limitsInput.length === 0) {
    return NextResponse.json({ error: "limits array is required." }, { status: 400 });
  }

  // Validate each limit
  for (const l of limitsInput) {
    if (l.year < 2 || l.year > 4) {
      return NextResponse.json(
        { error: `Invalid year: ${l.year}. Must be 2, 3, or 4.` },
        { status: 400 }
      );
    }
    if (typeof l.max_slots !== "number" || l.max_slots < 0) {
      return NextResponse.json(
        { error: `Invalid max_slots for year ${l.year}.` },
        { status: 400 }
      );
    }
  }

  // Check that new limits are not below current filled count
  const { data: members } = await supabaseAdmin
    .from("club_members")
    .select("year, status")
    .eq("club_id", clubId)
    .in("status", ["reserved", "active"]);

  const filledByYear: Record<number, number> = {};
  (members || []).forEach((m) => {
    filledByYear[m.year] = (filledByYear[m.year] || 0) + 1;
  });

  for (const l of limitsInput) {
    const filled = filledByYear[l.year] || 0;
    if (l.max_slots < filled) {
      return NextResponse.json(
        {
          error: `Cannot set Year ${l.year} limit to ${l.max_slots} — there are already ${filled} reserved/active members.`,
        },
        { status: 400 }
      );
    }
  }

  // Upsert limits
  for (const l of limitsInput) {
    const { error } = await supabaseAdmin
      .from("club_year_limits")
      .upsert(
        { club_id: clubId, year: l.year, max_slots: l.max_slots },
        { onConflict: "club_id,year" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update club's updated_at
  await supabaseAdmin
    .from("clubs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", clubId);

  return NextResponse.json({ ok: true, message: "Year limits updated." });
}
