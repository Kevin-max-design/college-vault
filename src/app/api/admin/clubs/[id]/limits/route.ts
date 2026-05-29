import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH /api/admin/clubs/[id]/limits
 * HOD/Principal sets year-wise slot limits.
 * Body: { limits: [{ year: 2, max_slots: 20 }, { year: 3, max_slots: 20 }, { year: 4, max_slots: 10 }] }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(["hod", "principal"]);
  if (result.error) return result.error;
  const { id: clubId } = await params;

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
