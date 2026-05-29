import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/conversations/start
 * Starts (or gets) a conversation and inserts the initial message.
 * Body: { listing_id, body, request_type }
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const reqBody = await req.json().catch(() => ({}));
  const { listing_id, body, request_type } = reqBody;

  if (!listing_id || !body) {
    return NextResponse.json(
      { error: "listing_id and body are required." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();

  // 1. Fetch listing details to verify seller and existence
  const { data: listing, error: listError } = await supabase
    .from("listings")
    .select("seller_id, title")
    .eq("id", listing_id)
    .single();

  if (listError || !listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const buyer_id = result.user.id;
  const seller_id = listing.seller_id;

  if (buyer_id === seller_id) {
    return NextResponse.json(
      { error: "You cannot message your own listing." },
      { status: 400 }
    );
  }

  // 2. Upsert conversation using unique (listing_id, buyer_id, seller_id)
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      {
        listing_id,
        buyer_id,
        seller_id,
        last_message: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id, buyer_id, seller_id" }
    )
    .select(`
      *,
      listing:listings(id, title, price, status, images, category),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (convError || !conversation) {
    return NextResponse.json(
      { error: convError?.message || "Failed to start conversation." },
      { status: 500 }
    );
  }

  // 3. Insert first message from the buyer
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      listing_id,
      sender_id: buyer_id,
      receiver_id: seller_id,
      body,
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  // Notify the seller about the new conversation/message
  try {
    await createNotification({
      userId: seller_id,
      type: 'message',
      title: 'New Market Message',
      body: `${result.user.full_name}: "${body.trim().substring(0, 80)}${body.trim().length > 80 ? '...' : ''}"`,
      link: '/vault?view=inbox',
      actorId: buyer_id,
      category: 'market_message',
      priority: 'normal',
      source: 'market',
    });
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }

  // 4. Return conversation and first message
  return NextResponse.json({ conversation, message }, { status: 201 });
}
