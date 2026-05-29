import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/clubs/[id]/reserve
 * Reserve a club slot via the race-safe RPC function.
 * Only students with year_of_study 2-4 can reserve.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;
  const { id: clubId } = await params;

  // Only students can reserve
  if (user.role !== "student") {
    return NextResponse.json(
      { error: "Only students can reserve club slots." },
      { status: 403 }
    );
  }

  // Use profile year_of_study (server-side, not frontend)
  const userYear = user.year_of_study;

  if (userYear < 2 || userYear > 4) {
    return NextResponse.json(
      { error: "Only 2nd, 3rd, and 4th year students can join clubs." },
      { status: 403 }
    );
  }

  // Call the race-safe RPC
  const { data, error } = await supabaseAdmin.rpc("reserve_club_slot", {
    p_club_id: clubId,
    p_user_id: user.id,
    p_year: userYear,
  });

  if (error) {
    console.error("[CLUBS] RPC reserve_club_slot error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rpcResult = data as {
    ok: boolean;
    error?: string;
    result?: string;
    member_id?: string;
    position?: number;
    message?: string;
  };

  if (!rpcResult.ok) {
    return NextResponse.json({ error: rpcResult.error }, { status: 400 });
  }

  // Fetch club name for notification
  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("name, lead_id")
    .eq("id", clubId)
    .single();

  // Send notifications
  if (rpcResult.result === "reserved" && club?.lead_id) {
    // Notify club lead about new reservation
    await createNotification({
      userId: club.lead_id,
      type: "club_reservation",
      title: `New reservation: ${club.name}`,
      body: `${user.full_name} (Year ${userYear}) has reserved a slot. Payment pending.`,
      link: "/admin/clubs",
      actorId: user.id,
      category: "general",
      priority: "normal",
    });
  }

  if (rpcResult.result === "waitlisted") {
    // Notify the student that they are waitlisted
    await createNotification({
      userId: user.id,
      type: "club_waitlist",
      title: `Waitlisted: ${club?.name || "Club"}`,
      body: `All slots are full. You are at position ${rpcResult.position}.`,
      link: "/clubs",
      category: "general",
      priority: "normal",
    });
  }

  return NextResponse.json(rpcResult);
}
