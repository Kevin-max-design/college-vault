import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers';

/**
 * POST /api/push/unsubscribe
 * Deregisters a push subscription for the logged-in user.
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const userId = result.user.id;

  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing subscription endpoint.' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // Delete the subscription matching both user_id and endpoint
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing request.' }, { status: 400 });
  }
}
