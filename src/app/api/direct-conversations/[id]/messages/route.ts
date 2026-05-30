import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/direct-conversations/[id]/messages
 * Retrieve message history for a general direct conversation.
 * Marks any unread messages sent by the peer to the current user as read.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const userId = result.user.id;
  
  const { id: conversationId } = await params;

  const supabase = await getSupabaseClient();

  // 1. Fetch all messages in the conversation
  const { data: messages, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Mark peer messages as read (where receiver is the current user)
  const { error: readErr } = await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (readErr) {
    console.error("[DIRECT_DM] Failed to mark messages as read:", readErr.message);
  }

  return NextResponse.json({ messages });
}

/**
 * POST /api/direct-conversations/[id]/messages
 * Sends a new direct message, inserts in DB, and dispatches persistent and OS-level push notifications.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const userId = result.user.id;

  const { id: conversationId } = await params;

  try {
    const { body } = await req.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // 1. Fetch conversation to determine the receiver & verify membership
    const { data: convo, error: convoErr } = await supabase
      .from("direct_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (convo.user_one !== userId && convo.user_two !== userId) {
      return NextResponse.json({ error: "Access denied to conversation." }, { status: 403 });
    }

    const receiverId = convo.user_one === userId ? convo.user_two : convo.user_one;

    // 2. Enforce target user privacy settings on message send (additional security)
    const { data: receiverProfile } = await supabase
      .from("profiles")
      .select("dm_privacy, department")
      .eq("id", receiverId)
      .single();
    
    if (receiverProfile) {
      const privacy = receiverProfile.dm_privacy || "everyone";
      if (privacy === "no_one") {
        return NextResponse.json({ error: "This student has disabled direct DMs." }, { status: 403 });
      }
      if (privacy === "same_department") {
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("department")
          .eq("id", userId)
          .single();
        if (senderProfile?.department !== receiverProfile.department) {
          return NextResponse.json({
            error: "This student only accepts messages from their own department."
          }, { status: 403 });
        }
      }
    }

    // 3. Insert direct message
    const { data: message, error: insertError } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        receiver_id: receiverId,
        body: body.trim(),
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 4. Query sender details
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const senderName = senderProfile?.full_name || "Someone";

    // 5. Fire-and-forget push and persistent in-app notifications
    try {
      await createNotification({
        userId: receiverId,
        actorId: userId,
        type: "direct_message",
        category: "direct_message",
        priority: "normal",
        source: "connect",
        title: "New connect DM",
        body: `${senderName}: "${body.trim().substring(0, 50)}${body.trim().length > 50 ? "..." : ""}"`,
        link: `/inbox?type=direct_dm&conversationId=${conversationId}`,
      });
    } catch (notifErr) {
      console.error("Async direct-message notification dispatch failed:", notifErr);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body." }, { status: 400 });
  }
}
