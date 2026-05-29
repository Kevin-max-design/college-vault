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
    console.warn('Web Push skipped: VAPID keys not configured in server environment.');
    return;
  }

  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(`Failed to fetch push subscriptions for user ${userId}:`, error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`);
      return;
    }

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
        console.log(`Successfully sent push notification to endpoint: ${sub.endpoint}`);
      } catch (err: any) {
        console.error(`Error sending push notification to endpoint ${sub.endpoint}:`, err);
        
        // Remove expired, gone or invalid push subscriptions (HTTP 410 or 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Removing expired or invalid push subscription: ${sub.endpoint}`);
          const { error: deleteError } = await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          if (deleteError) {
            console.error(`Failed to delete expired subscription ${sub.id}:`, deleteError);
          }
        }
      }
    });

    // Run all pushes in parallel without blocking main flow
    await Promise.all(pushPromises);
  } catch (err) {
    console.error('Fatal error in sendPushToUser:', err);
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
    console.log(`Notification skipped: User ${userId} is the actor.`);
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
      console.error('Failed to create in-app notification in DB:', error);
    }

    // 2. Dispatch push notification (fire-and-forget, non-blocking)
    sendPushToUser(userId, {
      title,
      body,
      link,
      category,
      priority,
    }).catch((err) => {
      console.error('Async Web Push delivery failed:', err);
    });

    return notification;
  } catch (error) {
    console.error('Error in createNotification helper:', error);
    return null;
  }
}
