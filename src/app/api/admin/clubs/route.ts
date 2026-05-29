import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/admin/clubs
 * Returns all clubs with full admin stats (counts, limits, payments, waitlists).
 * HOD, Principal only.
 */
export async function GET() {
  const result = await requireRole(["hod", "principal"]);
  if (result.error) return result.error;

  // 1. All clubs
  const { data: clubs, error: clubsErr } = await supabaseAdmin
    .from("clubs")
    .select("*")
    .order("name");

  if (clubsErr) {
    return NextResponse.json({ error: clubsErr.message }, { status: 500 });
  }

  // 2. All year limits
  const { data: limits } = await supabaseAdmin
    .from("club_year_limits")
    .select("*");

  // 3. All members
  const { data: members } = await supabaseAdmin
    .from("club_members")
    .select("club_id, year, status");

  // 4. All payments
  const { data: payments } = await supabaseAdmin
    .from("club_payments")
    .select("club_id, status");

  // 5. All waitlists
  const { data: waitlist } = await supabaseAdmin
    .from("club_waitlist")
    .select("club_id, year");

  // 6. Lead profiles
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

  // Build stats
  const memberStats: Record<string, { reserved: number; active: number; rejected: number }> = {};
  (members || []).forEach((m) => {
    if (!memberStats[m.club_id]) memberStats[m.club_id] = { reserved: 0, active: 0, rejected: 0 };
    if (m.status === "reserved") memberStats[m.club_id].reserved++;
    else if (m.status === "active") memberStats[m.club_id].active++;
    else if (m.status === "rejected") memberStats[m.club_id].rejected++;
  });

  const paymentStats: Record<string, { pending: number; verified: number; rejected: number }> = {};
  (payments || []).forEach((p) => {
    if (!paymentStats[p.club_id]) paymentStats[p.club_id] = { pending: 0, verified: 0, rejected: 0 };
    if (p.status === "pending") paymentStats[p.club_id].pending++;
    else if (p.status === "verified") paymentStats[p.club_id].verified++;
    else if (p.status === "rejected") paymentStats[p.club_id].rejected++;
  });

  const waitlistCounts: Record<string, number> = {};
  (waitlist || []).forEach((w) => {
    waitlistCounts[w.club_id] = (waitlistCounts[w.club_id] || 0) + 1;
  });

  // Filled per year
  const filledMap: Record<string, Record<number, number>> = {};
  (members || []).forEach((m) => {
    if (m.status !== "reserved" && m.status !== "active") return;
    if (!filledMap[m.club_id]) filledMap[m.club_id] = {};
    filledMap[m.club_id][m.year] = (filledMap[m.club_id][m.year] || 0) + 1;
  });

  const limitsMap: Record<string, Array<{ year: number; max_slots: number; filled: number; id: string }>> = {};
  (limits || []).forEach((l) => {
    if (!limitsMap[l.club_id]) limitsMap[l.club_id] = [];
    limitsMap[l.club_id].push({
      id: l.id,
      year: l.year,
      max_slots: l.max_slots,
      filled: filledMap[l.club_id]?.[l.year] || 0,
    });
  });

  const enriched = (clubs || []).map((club) => ({
    ...club,
    lead_name: club.lead_id ? leadProfiles[club.lead_id] || null : null,
    year_limits: (limitsMap[club.id] || []).sort((a, b) => a.year - b.year),
    member_stats: memberStats[club.id] || { reserved: 0, active: 0, rejected: 0 },
    payment_stats: paymentStats[club.id] || { pending: 0, verified: 0, rejected: 0 },
    waitlist_count: waitlistCounts[club.id] || 0,
  }));

  return NextResponse.json({ clubs: enriched });
}
