import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/clubs/[id]/payments/[paymentId]/proof
 * Allows a student to upload a payment proof screenshot/file.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const user = result.user;
  const { id: clubId, paymentId } = await params;

  // 1. Fetch the payment and check ownership
  const { data: payment, error: payErr } = await supabaseAdmin
    .from("club_payments")
    .select("*, club:clubs(name, lead_id)")
    .eq("id", paymentId)
    .eq("club_id", clubId)
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  }

  // Ensure user owns this payment
  if (payment.user_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden. You cannot upload proof for someone else's payment." },
      { status: 403 }
    );
  }

  // 2. Parse form data
  let file: File | null = null;
  let note = "";
  try {
    const formData = await req.formData();
    file = formData.get("file") as File;
    note = (formData.get("note") as string) || "";
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No proof file uploaded." }, { status: 400 });
  }

  // Limit file size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size exceeds 5MB limit." }, { status: 400 });
  }

  try {
    // 3. Upload file to Supabase storage 'attachments' bucket
    const fileExt = file.name.split(".").pop();
    const cleanFileName = `proof_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/club-payments/${paymentId}/${cleanFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("attachments")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.error("[PAYMENTS] Storage upload failed:", uploadErr.message);
      return NextResponse.json({ error: "Failed to save file attachment." }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("attachments")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || "";

    // 4. Update the payment record in the DB
    const { error: dbErr } = await supabaseAdmin
      .from("club_payments")
      .update({
        proof_url: publicUrl,
        proof_uploaded_at: new Date().toISOString(),
        payment_note: note,
        status: "pending", // Reset status to pending in case it was rejected earlier
      })
      .eq("id", paymentId);

    if (dbErr) {
      console.error("[PAYMENTS] DB update failed:", dbErr.message);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    // 5. Notify the club lead
    const club = payment.club as any;
    if (club?.lead_id) {
      await createNotification({
        userId: club.lead_id,
        type: "club_payment_proof",
        title: `Payment proof: ${club.name}`,
        body: `${user.full_name} has uploaded payment proof. Click to verify.`,
        link: "/club-lead",
        actorId: user.id,
        category: "general",
        priority: "normal",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Payment proof uploaded successfully.",
      proof_url: publicUrl,
    });
  } catch (err: any) {
    console.error("[PAYMENTS] Proof upload error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
