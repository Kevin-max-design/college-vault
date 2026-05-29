import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

/**
 * GET /api/club-lead/clubs/[id]/export
 * Generates and returns an Excel report with multiple sheets for the assigned club only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;
  const { id: clubId } = await params;

  // Authorization: must be club lead, HOD, or Principal
  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single();

  if (!club) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 });
  }

  const isLead = club.lead_id === user.id;
  const isAdmin = user.role === "hod" || user.role === "principal";

  if (!isLead && !isAdmin) {
    return NextResponse.json(
      { error: "Forbidden. You do not have permission to export this club." },
      { status: 403 }
    );
  }

  // Fetch all data for this specific club
  const [limitsRes, membersRes, paymentsRes, waitlistRes] = await Promise.all([
    supabaseAdmin.from("club_year_limits").select("*").eq("club_id", clubId),
    supabaseAdmin.from("club_members").select("*").eq("club_id", clubId).order("reserved_at"),
    supabaseAdmin.from("club_payments").select("*").eq("club_id", clubId).order("created_at"),
    supabaseAdmin.from("club_waitlist").select("*").eq("club_id", clubId).order("position"),
  ]);

  const limits = limitsRes.data || [];
  const members = membersRes.data || [];
  const payments = paymentsRes.data || [];
  const waitlist = waitlistRes.data || [];

  // Fetch all user profiles involved
  const allUserIds = new Set<string>();
  members.forEach((m) => allUserIds.add(m.user_id));
  waitlist.forEach((w) => allUserIds.add(w.user_id));
  if (club.lead_id) allUserIds.add(club.lead_id);
  payments.forEach((p) => { if (p.verified_by) allUserIds.add(p.verified_by); });

  let profileMap: Record<string, { full_name: string; email: string; department: string; year_of_study: number; college_id: string }> = {};
  if (allUserIds.size > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, department, year_of_study, college_id")
      .in("id", Array.from(allUserIds));
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

  // Build workbook
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ────────────────────────────────────────────
  const summaryData = [{
    "Club Name": club.name,
    "Status": club.is_open ? "Open" : "Closed",
    "Lead": club.lead_id ? profileMap[club.lead_id]?.full_name || "" : "Unassigned",
    "Semester": club.semester_label || "",
    "Total Reserved": members.filter((m) => m.status === "reserved").length,
    "Total Active": members.filter((m) => m.status === "active").length,
    "Total Rejected": members.filter((m) => m.status === "rejected").length,
    "Pending Payments": payments.filter((p) => p.status === "pending").length,
    "Verified Payments": payments.filter((p) => p.status === "verified").length,
    "Estimated Verified Collection": `₹${payments.filter((p) => p.status === "verified").length * 200}`,
    "Waitlisted": waitlist.length,
  }];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // ── Sheet 2: Year-wise Breakdown ────────────────────────────────
  limits.sort((a, b) => a.year - b.year);
  const yearData = limits.map((l) => {
    const filled = members.filter(
      (m) => m.year === l.year && (m.status === "reserved" || m.status === "active")
    ).length;
    return {
      "Year": `Year ${l.year}`,
      "Max Slots": l.max_slots,
      "Filled": filled,
      "Available": Math.max(0, l.max_slots - filled),
      "Waitlisted": waitlist.filter((w) => w.year === l.year).length,
    };
  });
  const yearWs = XLSX.utils.json_to_sheet(yearData.length > 0 ? yearData : [{ "No limits configured": "" }]);
  XLSX.utils.book_append_sheet(wb, yearWs, "Year-wise Count");

  // ── Sheet 3: Members ────────────────────────────────────────────
  const memberData = members.map((m, idx) => ({
    "S.No": idx + 1,
    "Student Name": profileMap[m.user_id]?.full_name || "",
    "Email": profileMap[m.user_id]?.email || "",
    "College ID": profileMap[m.user_id]?.college_id || "",
    "Department": profileMap[m.user_id]?.department || "",
    "Year": m.year,
    "Payment Status": payments.find(p => p.member_id === m.id)?.status || "pending",
    "Membership Status": m.status,
    "Reserved At": m.reserved_at,
  }));
  const memberWs = XLSX.utils.json_to_sheet(memberData.length > 0 ? memberData : [{ "No members": "" }]);
  XLSX.utils.book_append_sheet(wb, memberWs, "Members");

  // ── Sheet 4: Pending Payments ───────────────────────────────────
  const pendingPayments = payments
    .filter((p) => p.status === "pending")
    .map((p) => ({
      "Student Name": profileMap[p.user_id]?.full_name || "",
      "Email": profileMap[p.user_id]?.email || "",
      "College ID": profileMap[p.user_id]?.college_id || "",
      "Department": profileMap[p.user_id]?.department || "",
      "Year": profileMap[p.user_id]?.year_of_study || "",
      "Amount": `₹${p.amount}`,
      "Proof Uploaded": p.proof_url ? "Yes" : "No",
      "Created At": p.created_at,
    }));
  const pendingWs = XLSX.utils.json_to_sheet(pendingPayments.length > 0 ? pendingPayments : [{ "No pending payments": "" }]);
  XLSX.utils.book_append_sheet(wb, pendingWs, "Pending Payments");

  // ── Sheet 5: Verified Payments ──────────────────────────────────
  const verifiedPayments = payments
    .filter((p) => p.status === "verified")
    .map((p) => ({
      "Student Name": profileMap[p.user_id]?.full_name || "",
      "Email": profileMap[p.user_id]?.email || "",
      "College ID": profileMap[p.user_id]?.college_id || "",
      "Department": profileMap[p.user_id]?.department || "",
      "Year": profileMap[p.user_id]?.year_of_study || "",
      "Amount": `₹${p.amount}`,
      "Verified By": p.verified_by ? profileMap[p.verified_by]?.full_name || "" : "",
      "Verified At": p.verified_at || "",
    }));
  const verifiedWs = XLSX.utils.json_to_sheet(verifiedPayments.length > 0 ? verifiedPayments : [{ "No verified payments": "" }]);
  XLSX.utils.book_append_sheet(wb, verifiedWs, "Verified Payments");

  // ── Sheet 6: Waitlist ───────────────────────────────────────────
  const waitlistData = waitlist.map((w) => ({
    "Position": w.position,
    "Student Name": profileMap[w.user_id]?.full_name || "",
    "Email": profileMap[w.user_id]?.email || "",
    "College ID": profileMap[w.user_id]?.college_id || "",
    "Year": w.year,
    "Joined At": w.joined_at,
  }));
  const waitlistWs = XLSX.utils.json_to_sheet(waitlistData.length > 0 ? waitlistData : [{ "No waitlist entries": "" }]);
  XLSX.utils.book_append_sheet(wb, waitlistWs, "Waitlist");

  // Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const safeClubName = club.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CampusVault_${safeClubName}_Members_Report_${dateStr}.xlsx"`,
    },
  });
}
