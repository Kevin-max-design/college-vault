import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/inbox
 * Fetches unified inbox items for the current user, combining marketplace
 * conversations and classroom direct messages (peer_messages), sorted by latest message date.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const supabase = await getSupabaseClient();
  const userId = result.user.id;

  try {
    // 1. Fetch marketplace conversations
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        listing:listings(id, title, price, status, images, category),
        buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url, role),
        seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url, role)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // 2. Fetch classroom direct DMs (peer_messages) involving current user
    const { data: messages, error: msgError } = await supabase
      .from("peer_messages")
      .select("id, body, created_at, classroom_id, sender_id, receiver_id")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // 3. Perform in-memory join for peer_messages relationships (schema cache independent)
    let classroomDMs: any[] = [];
    if (messages && messages.length > 0) {
      const userIds = Array.from(new Set(messages.flatMap((m) => [m.sender_id, m.receiver_id])));
      const classroomIds = Array.from(new Set(messages.map((m) => m.classroom_id)));

      const [profilesRes, classroomsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, role").in("id", userIds),
        supabase.from("classrooms").select("id, name").in("id", classroomIds),
      ]);

      if (profilesRes.error) {
        return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
      }
      if (classroomsRes.error) {
        return NextResponse.json({ error: classroomsRes.error.message }, { status: 500 });
      }

      const profilesMap = new Map(profilesRes.data.map((p) => [p.id, p]));
      const classroomsMap = new Map(classroomsRes.data.map((c) => [c.id, c]));

      // Group peer messages by classroom_id + other_user_id
      const groupedDMs = new Map();
      for (const msg of messages) {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const otherUser = profilesMap.get(otherUserId);
        if (!otherUser) continue;

        const key = `${msg.classroom_id}_${otherUserId}`;
        if (!groupedDMs.has(key)) {
          const classroom = classroomsMap.get(msg.classroom_id);
          groupedDMs.set(key, {
            id: key,
            kind: "classroom_dm",
            title: otherUser.full_name || "Anonymous",
            subtitle: classroom?.name || "Direct Message",
            otherUserId: otherUser.id,
            otherUserName: otherUser.full_name || "Anonymous",
            otherUserAvatar: otherUser.avatar_url || null,
            otherUserRole: otherUser.role || "student",
            lastMessage: msg.body,
            lastMessageAt: msg.created_at,
            classroomId: msg.classroom_id,
          });
        }
      }
      classroomDMs = Array.from(groupedDMs.values());
    }

    // 4. Map marketplace conversations
    const marketInbox = (conversations ?? []).map((conv) => {
      const isBuyer = conv.buyer_id === userId;
      const otherUser = isBuyer ? conv.seller : conv.buyer;
      return {
        id: conv.id,
        kind: "market",
        title: conv.listing?.title || "Unknown Item",
        subtitle: isBuyer ? "Buying" : "Selling",
        otherUserId: otherUser?.id,
        otherUserName: otherUser?.full_name || "Anonymous",
        otherUserAvatar: otherUser?.avatar_url || null,
        otherUserRole: otherUser?.role || "student",
        lastMessage: conv.last_message || "No messages yet.",
        lastMessageAt: conv.updated_at,
        listingId: conv.listing_id,
        conversationId: conv.id,
      };
    });

    // 5. Merge and sort by lastMessageAt descending
    const mergedInbox = [...marketInbox, ...classroomDMs].sort((a, b) => {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return NextResponse.json({ inbox: mergedInbox });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An error occurred." }, { status: 500 });
  }
}
