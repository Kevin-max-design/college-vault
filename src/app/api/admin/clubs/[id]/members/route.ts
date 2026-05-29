import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/admin/clubs/[id]/members
 * Returns all members, payments, and waitlist entries for a club.
 * Accessible by HOD, Principal, or the club lead.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;
  const { id: clubId } = await params;

  // Authorization
  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("id, name, lead_id")
    .eq("id", clubId)
    .single();

  if (!club) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 });
  }

  const isLead = club.lead_id === user.id;
  const isAdmin = user.role === "hod" || user.role === "principal";

  if (!isLead && !isAdmin) {
    return NextResponse.json(
      { error: "Only the club lead or admin can view members." },
      { status: 403 }
    );
  }

  // Fetch members
  const { data: members } = await supabaseAdmin
    .from("club_members")
    .select("*")
    .eq("club_id", clubId)
    .order("reserved_at", { ascending: true });

  // Fetch payments
  const { data: payments } = await supabaseAdmin
    .from("club_payments")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  // Fetch waitlist
  const { data: waitlist } = await supabaseAdmin
    .from("club_waitlist")
    .select("*")
    .eq("club_id", clubId)
    .order("position", { ascending: true });

  // Fetch user profiles for all user_ids
  const userIds = new Set<string>();
  (members || []).forEach((m) => userIds.add(m.user_id));
  (waitlist || []).forEach((w) => userIds.add(w.user_id));

  let profileMap: Record<string, { full_name: string; email: string; department: string; year_of_study: number; college_id: string }> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, department, year_of_study, college_id")
      .in("id", Array.from(userIds));
    if (profiles) {
      profiles.forEach((p) => {
        profileMap[p.id] = {
          full_name: p.full_name,
          email: p.email,
          department: p.department,
          year_of_study: p.year_of_study,
          college_id: p.college_id,
        };
      });
    }
  }

  // Enrich members with profile data and payment
  const paymentByMember: Record<string, unknown> = {};
  (payments || []).forEach((p) => {
    paymentByMember[p.member_id] = p;
  });

  const enrichedMembers = (members || []).map((m) => ({
    ...m,
    profile: profileMap[m.user_id] || null,
    payment: paymentByMember[m.id] || null,
  }));

  const enrichedWaitlist = (waitlist || []).map((w) => ({
    ...w,
    profile: profileMap[w.user_id] || null,
  }));

  return NextResponse.json({
    club,
    members: enrichedMembers,
    waitlist: enrichedWaitlist,
  });
}
