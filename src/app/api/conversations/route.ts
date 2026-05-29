import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/conversations
 * Returns all conversations for the authenticated user, ordered by updated_at desc.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const supabase = await getSupabaseClient();

  // Fetch conversations where current user is either buyer_id or seller_id
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      listing:listings(id, title, price, status, images, category),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)
    `)
    .or(`buyer_id.eq.${result.user.id},seller_id.eq.${result.user.id}`)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}
