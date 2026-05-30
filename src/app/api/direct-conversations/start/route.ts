import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * POST /api/direct-conversations/start
 * Starts a new general direct conversation or retrieves an existing one.
 * Body: { receiver_id: string }
 * Enforces server-side privacy rules:
 * - self-messaging block
 * - dm_privacy = 'no_one' block
 * - dm_privacy = 'same_department' block
 * Enforces sorted UUID pair order to prevent duplicates.
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const senderId = result.user.id;

  try {
    const { receiver_id } = await req.json();
    if (!receiver_id) {
      return NextResponse.json({ error: "Missing receiver_id." }, { status: 400 });
    }

    if (senderId === receiver_id) {
      return NextResponse.json({ error: "Self-messaging is not allowed." }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // 1. Fetch receiver's profile & DM privacy settings
    const { data: receiver, error: recErr } = await supabase
      .from("profiles")
      .select("department, dm_privacy, profile_visibility")
      .eq("id", receiver_id)
      .single();

    if (recErr || !receiver) {
      return NextResponse.json({ error: "Target student profile not found." }, { status: 404 });
    }

    const privacy = receiver.dm_privacy || "everyone";

    // Block: no_one
    if (privacy === "no_one") {
      return NextResponse.json({ error: "This student has disabled direct DMs." }, { status: 403 });
    }

    // Block: same_department
    if (privacy === "same_department") {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", senderId)
        .single();
      
      if (senderProfile?.department !== receiver.department) {
        return NextResponse.json({
          error: "This student only accepts messages from their own department."
        }, { status: 403 });
      }
    }

    // 2. Resolve lexicographical sorted order for user_one < user_two
    const user_one = senderId < receiver_id ? senderId : receiver_id;
    const user_two = senderId > receiver_id ? senderId : receiver_id;

    // 3. Query existing conversation
    const { data: existing, error: existErr } = await supabase
      .from("direct_conversations")
      .select("*")
      .eq("user_one", user_one)
      .eq("user_two", user_two)
      .maybeSingle();

    if (existErr) {
      return NextResponse.json({ error: existErr.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ conversation: existing }, { status: 200 });
    }

    // 4. Create new conversation
    const { data: created, error: createErr } = await supabase
      .from("direct_conversations")
      .insert({ user_one, user_two })
      .select("*")
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body." }, { status: 400 });
  }
}
