import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import type { Notice, PushChannel } from './channels.js';

/**
 * Web push through Firebase Cloud Messaging.
 *
 * Tokens go stale constantly — a browser clears site data, a PWA is deleted,
 * a token rotates — so failures are expected and are reported back rather than
 * thrown, letting the caller drop the dead ones.
 *
 * `sendEachForMulticast` never throws for an individual token's failure —
 * only for a request-level problem — so a per-token error that isn't one of
 * the two "stale" codes below used to vanish with no log anywhere: not
 * stale, not thrown, not caught. Anything else is logged explicitly now, so
 * a real send failure (a permission problem, quota, a malformed payload) is
 * visible instead of looking identical to "delivered successfully".
 */
export const fcmPush: PushChannel = {
  name: 'fcm',
  async send(tokens: string[], notice: Notice) {
    if (tokens.length === 0) return { staleTokens: [] };

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: notice.title, body: notice.body },
      webpush: {
        fcmOptions: { link: notice.url },
        notification: {
          // A turn coming up is worth a buzz in a pocket.
          vibrate: [200, 100, 200],
          requireInteraction: false,
        },
      },
    });

    const staleTokens: string[] = [];
    response.responses.forEach((result, i) => {
      if (result.success) return;

      const code = result.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        const token = tokens[i];
        if (token) staleTokens.push(token);
        return;
      }

      logger.warn('FCM send failed for a token', {
        code,
        message: result.error?.message,
      });
    });

    return { staleTokens };
  },
};
