import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/conversations/[id]/messages
 * Fetches all messages in a conversation, ordered by created_at asc.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id: conversationId } = await ctx.params;
  const supabase = await getSupabaseClient();

  // 1. Verify user is participant in conversation
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .single();

  if (convError || !conv) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (conv.buyer_id !== result.user.id && conv.seller_id !== result.user.id) {
    return NextResponse.json({ error: "Forbidden — not a participant." }, { status: 403 });
  }

  // 2. Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
      receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [] });
}

/**
 * POST /api/conversations/[id]/messages
 * Sends a message in a conversation.
 * Body: { body }
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id: conversationId } = await ctx.params;
  const reqBody = await req.json().catch(() => ({}));
  const { body } = reqBody;

  if (!body || !body.trim()) {
    return NextResponse.json({ error: "body is required." }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  // 1. Fetch conversation details to verify participation and find receiver_id
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id")
    .eq("id", conversationId)
    .single();

  if (convError || !conv) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const userId = result.user.id;
  let receiverId = "";

  if (conv.buyer_id === userId) {
    receiverId = conv.seller_id;
  } else if (conv.seller_id === userId) {
    receiverId = conv.buyer_id;
  } else {
    return NextResponse.json({ error: "Forbidden — not a participant." }, { status: 403 });
  }

  // 2. Insert the message
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      listing_id: conv.listing_id,
      sender_id: userId,
      receiver_id: receiverId,
      body: body.trim(),
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (msgError || !message) {
    return NextResponse.json({ error: msgError?.message || "Failed to send message." }, { status: 500 });
  }

  // 3. Update the conversation
  await supabase
    .from("conversations")
    .update({
      last_message: body.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  // 4. Send persistent in-app notification to receiver
  try {
    await createNotification({
      userId: receiverId,
      type: 'message',
      title: 'New Personal Message',
      body: `${result.user.full_name}: "${body.trim().substring(0, 80)}${body.trim().length > 80 ? '...' : ''}"`,
      link: '/vault',
      actorId: userId
    });
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }

  return NextResponse.json(message, { status: 201 });
}
