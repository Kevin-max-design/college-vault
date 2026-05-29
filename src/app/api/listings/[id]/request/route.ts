import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/listings/[id]/request — Submit a buy/rent request on a listing
 * Body: { request_type: 'buy' | 'rent', message?: string }
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id: listingId } = await ctx.params;
  const requesterId = result.user.id;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID format." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { request_type, message } = body;

  if (!request_type || !["buy", "rent"].includes(request_type)) {
    return NextResponse.json({ error: "Valid request_type ('buy' or 'rent') is required." }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  // 1. Fetch listing details to verify seller and existence
  const { data: listing, error: listError } = await supabase
    .from("listings")
    .select("seller_id, title, price")
    .eq("id", listingId)
    .single();

  if (listError || !listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // 2. Prevent user requesting own listing
  if (listing.seller_id === requesterId) {
    return NextResponse.json({ error: "You cannot submit a request for your own listing." }, { status: 400 });
  }

  // 3. Upsert conversation first
  const autoMessage = `[${request_type.toUpperCase()} REQUEST] Hi! I'm interested in your listing: "${listing.title}". I have submitted a formal request to ${request_type} it for $${listing.price.toFixed(2)}. Let's coordinate!`;
  
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      {
        listing_id: listingId,
        buyer_id: requesterId,
        seller_id: listing.seller_id,
        last_message: autoMessage,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id, buyer_id, seller_id" }
    )
    .select("id")
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: convError?.message || "Failed to create conversation." }, { status: 500 });
  }

  // 4. Insert listing request
  const { data: newRequest, error: reqError } = await supabase
    .from("listing_requests")
    .insert({
      listing_id: listingId,
      requester_id: requesterId,
      seller_id: listing.seller_id,
      request_type,
      message: message ?? `Hi! I would like to submit a request to ${request_type} your "${listing.title}".`,
      status: "pending",
    })
    .select()
    .single();

  if (reqError) {
    if (reqError.code === "23505") { // Unique constraint
      return NextResponse.json({ error: "You have already submitted a request for this listing." }, { status: 400 });
    }
    return NextResponse.json({ error: reqError.message }, { status: 500 });
  }

  // 5. Automatically send a DM to the seller inside the conversation!
  await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      listing_id: listingId,
      sender_id: requesterId,
      receiver_id: listing.seller_id,
      body: autoMessage,
    });

  // Notify the seller of the buy/rent request
  try {
    await createNotification({
      userId: listing.seller_id,
      type: 'request',
      title: request_type === 'buy' ? 'New Buy Request' : 'New Rent Request',
      body: `${result.user.full_name} requested to ${request_type} your listing: "${listing.title}"`,
      link: '/vault?view=inbox',
      actorId: requesterId,
      category: 'listing_request',
      priority: 'high',
      source: 'market',
    });
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }

  return NextResponse.json({ success: true, data: newRequest, conversation_id: conversation.id }, { status: 201 });
}
