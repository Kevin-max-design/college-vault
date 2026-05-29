import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/messages?listing_id=xxx
 * Returns the conversation thread for a listing between the current user
 * and the other party.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listing_id");

  if (!listingId) {
    return NextResponse.json(
      { error: "listing_id query param is required." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();

  // RLS ensures only sender/receiver can read
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
      receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)
    `)
    .eq("listing_id", listingId)
    .or(`sender_id.eq.${result.user.id},receiver_id.eq.${result.user.id}`)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

/**
 * POST /api/messages — send a DM on a listing
 * Body: { listing_id, receiver_id, body }
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const reqBody = await req.json();
  const { listing_id, receiver_id, body } = reqBody;

  if (!listing_id || !receiver_id || !body) {
    return NextResponse.json(
      { error: "listing_id, receiver_id, and body are required." },
      { status: 400 }
    );
  }

  if (receiver_id === result.user.id) {
    return NextResponse.json(
      { error: "Cannot message yourself." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();

  // Upsert conversation to comply with conversation model
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      {
        listing_id,
        buyer_id: result.user.id,
        seller_id: receiver_id,
        last_message: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id, buyer_id, seller_id" }
    )
    .select("id")
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: convError?.message || "Failed to create conversation." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      listing_id,
      sender_id: result.user.id,
      receiver_id,
      body,
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
