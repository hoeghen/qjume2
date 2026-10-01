import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import {
  tokenTail,
  type Notice,
  type PushChannel,
  type PushTokenResult,
} from './channels.js';

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
 *
 * Every send also logs one summary line, success included. FCM accepting a
 * message is the last thing the server can see; without a line for it, "sent
 * and the phone dropped it" and "never sent at all" look the same in the log.
 */
export const fcmPush: PushChannel = {
  name: 'fcm',
  async send(tokens: string[], notice: Notice) {
    if (tokens.length === 0) return { staleTokens: [], results: [] };

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
    const results: PushTokenResult[] = response.responses.map((result, i) => {
      const token = tokens[i] ?? '';
      if (result.success) {
        return {
          token: tokenTail(token),
          outcome: 'sent',
          ...(result.messageId ? { messageId: result.messageId } : {}),
        };
      }

      const code = result.error?.code;
      const message = result.error?.message;
      const error = {
        ...(code ? { code } : {}),
        ...(message ? { message } : {}),
      };
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        if (token) staleTokens.push(token);
        return { token: tokenTail(token), outcome: 'stale', ...error };
      }

      logger.warn('FCM send failed for a token', {
        token: tokenTail(token),
        code,
        message,
      });
      return { token: tokenTail(token), outcome: 'failed', ...error };
    });

    logger.info('FCM send result', {
      title: notice.title,
      tokenCount: tokens.length,
      sent: results.filter((r) => r.outcome === 'sent').length,
      stale: staleTokens.length,
      failed: results.filter((r) => r.outcome === 'failed').length,
      results,
    });

    return { staleTokens, results };
  },
};
