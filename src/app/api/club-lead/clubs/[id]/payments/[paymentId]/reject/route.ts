import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/club-lead/clubs/[id]/payments/[paymentId]/reject
 * Club lead or HOD/Principal rejects a payment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;
  const { id: clubId, paymentId } = await params;

  // Authorization: must be club lead, HOD, or Principal
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
      { error: "Only the club lead or admin can reject payments." },
      { status: 403 }
    );
  }

  // Fetch the payment
  const { data: payment, error: payErr } = await supabaseAdmin
    .from("club_payments")
    .select("*")
    .eq("id", paymentId)
    .eq("club_id", clubId)
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  if (payment.status !== "pending") {
    return NextResponse.json(
      { error: `Payment already ${payment.status}.` },
      { status: 400 }
    );
  }

  // Parse optional rejection notes
  let notes = "";
  try {
    const body = await req.json();
    notes = body.notes || "";
  } catch {
    // no body is fine
  }

  // Update payment to rejected
  const { error: updatePayErr } = await supabaseAdmin
    .from("club_payments")
    .update({
      status: "rejected",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      notes,
    })
    .eq("id", paymentId);

  if (updatePayErr) {
    return NextResponse.json({ error: updatePayErr.message }, { status: 500 });
  }

  // Update member status to rejected
  const { error: updateMemErr } = await supabaseAdmin
    .from("club_members")
    .update({ status: "rejected" })
    .eq("id", payment.member_id);

  if (updateMemErr) {
    console.error("[CLUBS] Failed to reject member:", updateMemErr.message);
  }

  // Notify the student
  await createNotification({
    userId: payment.user_id,
    type: "club_payment_rejected",
    title: `Payment rejected: ${club.name}`,
    body: notes
      ? `Your payment for ${club.name} was rejected. Reason: ${notes}`
      : `Your payment for ${club.name} was rejected. Please contact the club lead.`,
    link: "/clubs",
    actorId: user.id,
    category: "general",
    priority: "high",
  });

  return NextResponse.json({ ok: true, message: "Payment rejected." });
}
