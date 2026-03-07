import webpush from 'web-push';
import { env } from '../config/env.js';

if (env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY) {
  webpush.setVapidDetails(env.WEB_PUSH_SUBJECT, env.WEB_PUSH_PUBLIC_KEY, env.WEB_PUSH_PRIVATE_KEY);
}

export async function sendWebPush(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: Record<string, unknown>,
): Promise<void> {
  if (!env.WEB_PUSH_PUBLIC_KEY || !env.WEB_PUSH_PRIVATE_KEY) {
    return;
  }
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
