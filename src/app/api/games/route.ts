import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/games?type=quiz
 * Returns available games.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("games")
    .select(`
      *,
      creator:profiles!games_created_by_fkey(id, full_name, avatar_url),
      game_sessions(count)
    `)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const games = (data ?? []).map((g) => ({
    ...g,
    play_count: g.game_sessions?.[0]?.count ?? 0,
    game_sessions: undefined,
  }));

  return NextResponse.json(games);
}

/**
 * POST /api/games — create a new game
 * Body: { title, type, description?, config }
 * Only faculty+ can create.
 */
export async function POST(req: NextRequest) {
  const result = await requireRole(["faculty", "hod", "principal"]);
  if (result.error) return result.error;

  const body = await req.json();
  const { title, type, description, config } = body;

  if (!title || !type || !config) {
    return NextResponse.json(
      { error: "title, type, and config are required." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("games")
    .insert({
      title,
      type,
      description: description ?? "",
      config,
      created_by: result.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
