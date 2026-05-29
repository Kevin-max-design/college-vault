import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/peer-messages
 * Sends a classroom direct peer-to-peer message and notifies the receiver.
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const senderId = result.user.id;

  try {
    const { classroom_id, receiver_id, body } = await req.json();

    if (!classroom_id || !receiver_id || !body?.trim()) {
      return NextResponse.json(
        { error: "classroom_id, receiver_id, and body are required." },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    // 1. Insert direct peer message into the database
    const { data: message, error: insertError } = await supabase
      .from("peer_messages")
      .insert({
        classroom_id,
        sender_id: senderId,
        receiver_id,
        body: body.trim(),
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Query sender profile to build personalized notification title/body
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", senderId)
      .single();

    const senderName = senderProfile?.full_name || "Someone";

    // 3. Create persistent in-app notification and Web Push (non-blocking)
    try {
      await createNotification({
        userId: receiver_id,
        actorId: senderId,
        type: "direct_message",
        category: "classroom_message",
        priority: "normal",
        source: "classroom",
        title: "New direct message",
        body: `${senderName} sent you a message`,
        link: `/vault?view=inbox&type=classroom_dm&classroomId=${classroom_id}&userId=${senderId}&userName=${encodeURIComponent(senderName)}`,
      });
    } catch (notifErr) {
      console.error("Async peer-message notification dispatch failed:", notifErr);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Invalid request body." },
      { status: 400 }
    );
  }
}
