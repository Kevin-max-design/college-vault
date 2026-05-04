import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/games/[id]/session — submit a game session / score
 * Body: { score }
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { id } = await ctx.params;
  const body = await req.json();
  const { score } = body;

  if (score === undefined || typeof score !== "number") {
    return NextResponse.json(
      { error: "score (number) is required." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();

  // Verify game exists
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select("id")
    .eq("id", id)
    .single();

  if (gameErr || !game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  // Record session
  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      game_id: id,
      player_id: result.user.id,
      score,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
