import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/games/leaderboard?game_id=xxx&department=CSE&limit=10
 * Returns top scores.
 *
 * If game_id is provided → leaderboard for that game
 * If not → top scores across all games (college-wide)
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game_id");
  const department = searchParams.get("department");
  const limit = parseInt(searchParams.get("limit") ?? "10");

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("game_sessions")
    .select(`
      id,
      score,
      completed_at,
      game:games!game_sessions_game_id_fkey(id, title, type),
      player:profiles!game_sessions_player_id_fkey(id, full_name, avatar_url, department)
    `)
    .order("score", { ascending: false })
    .limit(limit);

  if (gameId) query = query.eq("game_id", gameId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by department in JS (Supabase doesn't join-filter easily)
  let leaderboard = data ?? [];
  if (department) {
    leaderboard = leaderboard.filter(
      (entry) =>
        entry.player &&
        typeof entry.player === "object" &&
        "department" in entry.player &&
        entry.player.department === department
    );
  }

  // Add rank
  const ranked = leaderboard.map((entry, i) => ({
    rank: i + 1,
    ...entry,
  }));

  return NextResponse.json(ranked);
}
