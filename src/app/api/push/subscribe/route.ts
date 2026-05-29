import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers';

/**
 * POST /api/push/subscribe
 * Registers or updates a push subscription for the logged-in user.
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const userId = result.user.id;

  try {
    const { subscription } = await req.json();
    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return NextResponse.json({ error: 'Invalid subscription object.' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // Upsert subscription (if endpoint already registered, updates user_id & keys)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth_secret: subscription.keys.auth,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'endpoint'
        }
      )
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing request.' }, { status: 400 });
  }
}
