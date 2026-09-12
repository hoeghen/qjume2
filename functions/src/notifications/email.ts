import type { EmailChannel, Notice } from './channels.js';

interface ResendError {
  message?: string;
}

/**
 * Transactional email.
 *
 * Carries milestone alerts for every customer who will never receive a push —
 * which on iOS is most of them — so this is a primary channel, not a courtesy
 * copy.
 */
export function resendEmail(apiKey: string, from: string): EmailChannel {
  return {
    name: 'resend',
    async send(to: string, notice: Notice): Promise<void> {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: notice.title,
          text: `${notice.body}\n\n${notice.url}`,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const detail = (await response
          .json()
          .catch(() => ({}))) as ResendError;
        throw new Error(
          `Email failed: ${response.status} ${detail.message ?? ''}`.trim(),
        );
      }
    },
  };
}
