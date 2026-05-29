import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/admin';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@campusvault.local';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/* ── Category & Priority Types ─────────────────────────────────── */

export type NotificationCategory =
  | 'principal_announcement'
  | 'hod_notice'
  | 'faculty_announcement'
  | 'deadline'
  | 'market_message'
  | 'listing_request'
  | 'classroom_reply'
  | 'material_upload'
  | 'doubt_resolved'
  | 'classroom_message'
  | 'general';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type NotificationSource =
  | 'principal'
  | 'hod'
  | 'faculty'
  | 'system'
  | 'market'
  | 'classroom';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  actorId?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  source?: NotificationSource;
  expiresAt?: string; // ISO timestamp
}

/**
 * Dispatches a push notification to a user's registered Web Push devices.
 * Stale or expired subscriptions (Gone 410 / Not Found 404) are automatically pruned.
 */
export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    link: string;
    category?: string;
    priority?: string;
  }
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[PUSH] SKIPPED — VAPID keys not configured in server environment.');
    return;
  }

  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(`[PUSH] FAILED to fetch push_subscriptions for user ${userId}:`, error.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[PUSH] NO_SUBSCRIPTIONS for user ${userId} — user has not enabled push`);
      return;
    }

    console.log(`[PUSH] FOUND ${subscriptions.length} subscription(s) for user ${userId}`);

    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_secret
        }
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        console.log(`[PUSH] SENT_OK endpoint=${sub.endpoint.substring(0, 60)}...`);
      } catch (err: any) {
        console.error(`[PUSH] SEND_FAILED endpoint=${sub.endpoint.substring(0, 60)}... statusCode=${err.statusCode} message=${err.message}`);
        
        // Remove expired, gone or invalid push subscriptions (HTTP 410 or 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[PUSH] PRUNING expired subscription id=${sub.id}`);
          const { error: deleteError } = await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          if (deleteError) {
            console.error(`[PUSH] PRUNE_FAILED id=${sub.id}:`, deleteError.message);
          }
        }
      }
    });

    // Run all pushes in parallel without blocking main flow
    await Promise.all(pushPromises);
  } catch (err) {
    console.error('[PUSH] FATAL_ERROR in sendPushToUser:', err);
  }
}

/**
 * Standard central helper to log an in-app notification in DB and dispatch a Web Push.
 * Ensures the sender/actor is never notified of their own actions.
 *
 * Supports category, priority, source, and optional expiresAt for structured notifications.
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    body,
    link,
    actorId,
    category = 'general',
    priority = 'normal',
    source,
    expiresAt,
  } = params;

  // Do not notify the sender of their own actions
  if (actorId && userId === actorId) {
    console.log(`[NOTIF] SKIPPED — user ${userId} is the actor (self-action).`);
    return null;
  }

  try {
    // 1. Insert into user_notifications with category & priority
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      actor_id: actorId || null,
      type,
      title,
      body,
      target_url: link,
      read_at: null,
      category,
      priority,
    };
    if (source) insertPayload.source = source;
    if (expiresAt) insertPayload.expires_at = expiresAt;

    const { data: notification, error } = await supabaseAdmin
      .from('user_notifications')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[NOTIF] DB_INSERT_FAILED:', error.message);
    } else {
      console.log(`[NOTIF] DB_INSERT_OK id=${notification?.id} user=${userId} type=${type} category=${category}`);
    }

    // 2. Dispatch push notification (fire-and-forget, non-blocking)
    console.log(`[NOTIF] DISPATCHING_PUSH to user=${userId} title="${title}"`);
    sendPushToUser(userId, {
      title,
      body,
      link,
      category,
      priority,
    }).catch((err) => {
      console.error('[PUSH] ASYNC_DELIVERY_FAILED:', err);
    });

    return notification;
  } catch (error) {
    console.error('Error in createNotification helper:', error);
    return null;
  }
}
