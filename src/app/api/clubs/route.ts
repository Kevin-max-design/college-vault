import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/clubs
 * Returns all 7 clubs with year-wise limits, filled counts,
 * and current user's membership / waitlist status.
 */
export async function GET() {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;

  // 1. Fetch all clubs
  const { data: clubs, error: clubsErr } = await supabaseAdmin
    .from("clubs")
    .select("*")
    .order("name");

  if (clubsErr) {
    return NextResponse.json({ error: clubsErr.message }, { status: 500 });
  }

  // 2. Fetch all year limits
  const { data: limits } = await supabaseAdmin
    .from("club_year_limits")
    .select("*");

  // 3. Fetch filled counts (reserved + active) per club+year
  const { data: members } = await supabaseAdmin
    .from("club_members")
    .select("club_id, year, status")
    .in("status", ["reserved", "active"]);

  // 4. Fetch current user's memberships
  const { data: myMemberships } = await supabaseAdmin
    .from("club_members")
    .select("id, club_id, status, reserved_at")
    .eq("user_id", user.id)
    .in("status", ["reserved", "active"]);

  // 5. Fetch current user's payments
  const { data: myPayments } = await supabaseAdmin
    .from("club_payments")
    .select("id, club_id, member_id, status, amount, proof_url, proof_uploaded_at, payment_note, notes")
    .eq("user_id", user.id);

  // 6. Fetch current user's waitlist entries
  const { data: myWaitlist } = await supabaseAdmin
    .from("club_waitlist")
    .select("id, club_id, position")
    .eq("user_id", user.id);

  // 7. Fetch lead profiles for display
  const leadIds = (clubs || []).map((c) => c.lead_id).filter(Boolean);
  let leadProfiles: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", leadIds);
    if (leads) {
      leads.forEach((l) => {
        leadProfiles[l.id] = l.full_name;
      });
    }
  }

  // Build filled count map: { clubId: { year: count } }
  const filledMap: Record<string, Record<number, number>> = {};
  (members || []).forEach((m) => {
    if (!filledMap[m.club_id]) filledMap[m.club_id] = {};
    filledMap[m.club_id][m.year] = (filledMap[m.club_id][m.year] || 0) + 1;
  });

  // Build user maps
  const myMemberMap: Record<string, { id: string; status: string; reserved_at: string }> = {};
  (myMemberships || []).forEach((m) => {
    myMemberMap[m.club_id] = { id: m.id, status: m.status, reserved_at: m.reserved_at };
  });

  const myPaymentMap: Record<string, { id: string; status: string; amount: number; proof_url: string | null; proof_uploaded_at: string | null; payment_note: string; notes: string }> = {};
  (myPayments || []).forEach((p) => {
    myPaymentMap[p.club_id] = {
      id: p.id,
      status: p.status,
      amount: Number(p.amount),
      proof_url: p.proof_url || null,
      proof_uploaded_at: p.proof_uploaded_at || null,
      payment_note: p.payment_note || '',
      notes: p.notes || ''
    };
  });

  const myWaitlistMap: Record<string, { id: string; position: number }> = {};
  (myWaitlist || []).forEach((w) => {
    myWaitlistMap[w.club_id] = { id: w.id, position: w.position };
  });

  // Build limits map: { clubId: [ { year, max_slots } ] }
  const limitsMap: Record<string, Array<{ year: number; max_slots: number; filled: number }>> = {};
  (limits || []).forEach((l) => {
    if (!limitsMap[l.club_id]) limitsMap[l.club_id] = [];
    limitsMap[l.club_id].push({
      year: l.year,
      max_slots: l.max_slots,
      filled: filledMap[l.club_id]?.[l.year] || 0,
    });
  });

  // Compose response
  const enriched = (clubs || []).map((club) => ({
    ...club,
    lead_name: club.lead_id ? leadProfiles[club.lead_id] || null : null,
    year_limits: (limitsMap[club.id] || []).sort((a, b) => a.year - b.year),
    my_membership: myMemberMap[club.id] || null,
    my_payment: myPaymentMap[club.id] || null,
    my_waitlist: myWaitlistMap[club.id] || null,
  }));

  return NextResponse.json({ clubs: enriched, user_year: user.year_of_study, user_role: user.role });
}
