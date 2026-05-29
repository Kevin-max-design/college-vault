import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/club-lead/dashboard
 * Returns dashboard data for all clubs led by the current user.
 * If the user is HOD or Principal, returns dashboard data for all clubs.
 */
export async function GET() {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;

  const isAdmin = user.role === "hod" || user.role === "principal";

  // Get clubs managed by this user
  let clubsQuery = supabaseAdmin.from("clubs").select("*").order("name");
  if (!isAdmin) {
    clubsQuery = clubsQuery.eq("lead_id", user.id);
  }

  const { data: clubs, error: clubsErr } = await clubsQuery;

  if (clubsErr) {
    return NextResponse.json({ error: clubsErr.message }, { status: 500 });
  }

  // If not admin and doesn't lead any clubs, return 403
  if (!isAdmin && (!clubs || clubs.length === 0)) {
    return NextResponse.json(
      { error: "Access Denied. You are not a club lead." },
      { status: 403 }
    );
  }

  const clubIds = clubs.map((c) => c.id);

  // Fetch all limits for these clubs
  const { data: limits } = await supabaseAdmin
    .from("club_year_limits")
    .select("*")
    .in("club_id", clubIds);

  // Fetch all members for these clubs
  const { data: members } = await supabaseAdmin
    .from("club_members")
    .select("*, profile:profiles(full_name, email, department, year_of_study, college_id)")
    .in("club_id", clubIds)
    .order("reserved_at");

  // Fetch all payments for these clubs (includes proof_url, notes, etc.)
  const { data: payments } = await supabaseAdmin
    .from("club_payments")
    .select("*")
    .in("club_id", clubIds);

  // Fetch all waitlist entries for these clubs
  const { data: waitlist } = await supabaseAdmin
    .from("club_waitlist")
    .select("*, profile:profiles(full_name, email, department, year_of_study, college_id)")
    .in("club_id", clubIds)
    .order("position");

  // Map limits, members, payments, and waitlist by club_id
  const limitsMap: Record<string, any[]> = {};
  (limits || []).forEach((l) => {
    limitsMap[l.club_id] = limitsMap[l.club_id] || [];
    limitsMap[l.club_id].push(l);
  });

  const membersMap: Record<string, any[]> = {};
  (members || []).forEach((m) => {
    membersMap[m.club_id] = membersMap[m.club_id] || [];
    membersMap[m.club_id].push(m);
  });

  const paymentsMap: Record<string, any[]> = {};
  (payments || []).forEach((p) => {
    paymentsMap[p.club_id] = paymentsMap[p.club_id] || [];
    paymentsMap[p.club_id].push(p);
  });

  const waitlistMap: Record<string, any[]> = {};
  (waitlist || []).forEach((w) => {
    waitlistMap[w.club_id] = waitlistMap[w.club_id] || [];
    waitlistMap[w.club_id].push(w);
  });

  // Enrich clubs
  const enrichedClubs = clubs.map((club) => {
    const clubLimits = limitsMap[club.id] || [];
    const clubMembers = membersMap[club.id] || [];
    const clubPayments = paymentsMap[club.id] || [];
    const clubWaitlist = waitlistMap[club.id] || [];

    // Sort limits by year
    clubLimits.sort((a, b) => a.year - b.year);

    // Calculate year limit stats
    const yearLimits = clubLimits.map((l) => {
      const filled = clubMembers.filter(
        (m) => m.year === l.year && (m.status === "reserved" || m.status === "active")
      ).length;
      return {
        id: l.id,
        year: l.year,
        max_slots: l.max_slots,
        filled,
      };
    });

    // Match payment details with members
    const memberWithPayments = clubMembers.map((m) => {
      const pay = clubPayments.find((p) => p.member_id === m.id);
      return {
        ...m,
        payment: pay || null,
      };
    });

    const activeCount = clubMembers.filter((m) => m.status === "active").length;
    const reservedCount = clubMembers.filter((m) => m.status === "reserved").length;
    const rejectedCount = clubMembers.filter((m) => m.status === "rejected").length;

    const pendingPayCount = clubPayments.filter((p) => p.status === "pending").length;
    const verifiedPayCount = clubPayments.filter((p) => p.status === "verified").length;

    return {
      ...club,
      year_limits: yearLimits,
      members: memberWithPayments,
      waitlist: clubWaitlist,
      member_stats: {
        active: activeCount,
        reserved: reservedCount,
        rejected: rejectedCount,
      },
      payment_stats: {
        pending: pendingPayCount,
        verified: verifiedPayCount,
      },
      waitlist_count: clubWaitlist.length,
      estimated_collection: verifiedPayCount * 200,
    };
  });

  return NextResponse.json({
    clubs: enrichedClubs,
    user_role: user.role,
    user_name: user.full_name,
  });
}
