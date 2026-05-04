import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/listings?category=books&type=buy&status=available&page=1
 * Returns marketplace listings with seller profile.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("listings")
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, department)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [], page, limit });
}

/**
 * POST /api/listings — create a new listing
 * Body: { title, description?, price, type, category, images? }
 * Any authenticated user can list.
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const body = await req.json();
  const { title, description, price, type, category, images } = body;

  if (!title || price === undefined || !type || !category) {
    return NextResponse.json(
      { error: "title, price, type, and category are required." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: result.user.id,
      title,
      description: description ?? "",
      price: parseFloat(price),
      type,
      category,
      images: images ?? [],
    })
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, department)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
