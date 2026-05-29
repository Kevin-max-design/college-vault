import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/clubs/export
 * Generates and returns an Excel report with multiple sheets:
 * Summary, Club-wise, Year-wise, Members, Pending Payments, Verified Payments, Waitlist
 */
export async function GET() {
  const result = await requireRole(["hod", "principal"]);
  if (result.error) return result.error;

  // Fetch all data
  const [clubsRes, limitsRes, membersRes, paymentsRes, waitlistRes] = await Promise.all([
    supabaseAdmin.from("clubs").select("*").order("name"),
    supabaseAdmin.from("club_year_limits").select("*"),
    supabaseAdmin.from("club_members").select("*").order("reserved_at"),
    supabaseAdmin.from("club_payments").select("*").order("created_at"),
    supabaseAdmin.from("club_waitlist").select("*").order("position"),
  ]);

  const clubs = clubsRes.data || [];
  const limits = limitsRes.data || [];
  const members = membersRes.data || [];
  const payments = paymentsRes.data || [];
  const waitlist = waitlistRes.data || [];

  // Fetch all user profiles involved
  const allUserIds = new Set<string>();
  members.forEach((m) => allUserIds.add(m.user_id));
  waitlist.forEach((w) => allUserIds.add(w.user_id));
  clubs.forEach((c) => { if (c.lead_id) allUserIds.add(c.lead_id); });
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

  // Club name map
  const clubMap: Record<string, string> = {};
  clubs.forEach((c) => { clubMap[c.id] = c.name; });

  // Build workbook
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ────────────────────────────────────────────
  const summaryData = clubs.map((c) => {
    const clubMembers = members.filter((m) => m.club_id === c.id);
    const clubPayments = payments.filter((p) => p.club_id === c.id);
    const clubWaitlist = waitlist.filter((w) => w.club_id === c.id);
    return {
      "Club Name": c.name,
      "Status": c.is_open ? "Open" : "Closed",
      "Lead": c.lead_id ? profileMap[c.lead_id]?.full_name || "" : "",
      "Semester": c.semester_label || "",
      "Total Reserved": clubMembers.filter((m) => m.status === "reserved").length,
      "Total Active": clubMembers.filter((m) => m.status === "active").length,
      "Total Rejected": clubMembers.filter((m) => m.status === "rejected").length,
      "Pending Payments": clubPayments.filter((p) => p.status === "pending").length,
      "Verified Payments": clubPayments.filter((p) => p.status === "verified").length,
      "Waitlisted": clubWaitlist.length,
    };
  });
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // ── Sheet 2: Year-wise Breakdown ────────────────────────────────
  const yearData: Array<Record<string, unknown>> = [];
  clubs.forEach((c) => {
    const clubLimits = limits.filter((l) => l.club_id === c.id);
    clubLimits.sort((a, b) => a.year - b.year);
    clubLimits.forEach((l) => {
      const filled = members.filter(
        (m) => m.club_id === c.id && m.year === l.year && (m.status === "reserved" || m.status === "active")
      ).length;
      yearData.push({
        "Club": c.name,
        "Year": `Year ${l.year}`,
        "Max Slots": l.max_slots,
        "Filled": filled,
        "Available": Math.max(0, l.max_slots - filled),
        "Waitlisted": waitlist.filter((w) => w.club_id === c.id && w.year === l.year).length,
      });
    });
  });
  const yearWs = XLSX.utils.json_to_sheet(yearData);
  XLSX.utils.book_append_sheet(wb, yearWs, "Year-wise");

  // ── Sheet 3: All Members ────────────────────────────────────────
  const memberData = members.map((m) => ({
    "Club": clubMap[m.club_id] || "",
    "Student Name": profileMap[m.user_id]?.full_name || "",
    "Email": profileMap[m.user_id]?.email || "",
    "College ID": profileMap[m.user_id]?.college_id || "",
    "Department": profileMap[m.user_id]?.department || "",
    "Year": m.year,
    "Status": m.status,
    "Reserved At": m.reserved_at,
  }));
  const memberWs = XLSX.utils.json_to_sheet(memberData);
  XLSX.utils.book_append_sheet(wb, memberWs, "Members");

  // ── Sheet 4: Pending Payments ───────────────────────────────────
  const pendingPayments = payments
    .filter((p) => p.status === "pending")
    .map((p) => ({
      "Club": clubMap[p.club_id] || "",
      "Student Name": profileMap[p.user_id]?.full_name || "",
      "Email": profileMap[p.user_id]?.email || "",
      "College ID": profileMap[p.user_id]?.college_id || "",
      "Amount": `₹${p.amount}`,
      "Created At": p.created_at,
    }));
  const pendingWs = XLSX.utils.json_to_sheet(pendingPayments.length > 0 ? pendingPayments : [{ "No pending payments": "" }]);
  XLSX.utils.book_append_sheet(wb, pendingWs, "Pending Payments");

  // ── Sheet 5: Verified Payments ──────────────────────────────────
  const verifiedPayments = payments
    .filter((p) => p.status === "verified")
    .map((p) => ({
      "Club": clubMap[p.club_id] || "",
      "Student Name": profileMap[p.user_id]?.full_name || "",
      "Email": profileMap[p.user_id]?.email || "",
      "College ID": profileMap[p.user_id]?.college_id || "",
      "Amount": `₹${p.amount}`,
      "Verified By": p.verified_by ? profileMap[p.verified_by]?.full_name || "" : "",
      "Verified At": p.verified_at || "",
    }));
  const verifiedWs = XLSX.utils.json_to_sheet(verifiedPayments.length > 0 ? verifiedPayments : [{ "No verified payments": "" }]);
  XLSX.utils.book_append_sheet(wb, verifiedWs, "Verified Payments");

  // ── Sheet 6: Waitlist ───────────────────────────────────────────
  const waitlistData = waitlist.map((w) => ({
    "Club": clubMap[w.club_id] || "",
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

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clubs_report_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
