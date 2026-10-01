import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from 'firebase-functions';
import { fcmPush } from './fcm.js';
import type { Notice } from './channels.js';

const sendEachForMulticast = vi.fn();

// The only external boundary here — nothing else in this file is worth
// mocking, and everything else in this codebase is tested against the real
// Firestore emulator rather than stubs. There is no FCM emulator, so this is
// the one place that boundary has to be faked to be testable at all. Vitest
// hoists this above the imports above, so fcm.js picks up the mock.
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast }),
}));

const notice: Notice = {
  title: 'You’re next',
  body: 'Marta, you’re about to be called at Riverside Pharmacy.',
  url: 'https://qjume.dk/q/shop-1/queue-1',
};

afterEach(() => {
  sendEachForMulticast.mockReset();
  vi.restoreAllMocks();
});

describe('fcmPush', () => {
  it('does nothing with an empty token list, and never calls FCM', async () => {
    const result = await fcmPush.send([], notice);

    expect(result).toEqual({ staleTokens: [], results: [] });
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sends the notice content and a webpush link through to FCM', async () => {
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });

    await fcmPush.send(['token-1'], notice);

    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token-1'],
        notification: { title: notice.title, body: notice.body },
        webpush: expect.objectContaining({
          fcmOptions: { link: notice.url },
        }),
      }),
    );
  });

  it('reports a successful send as neither stale nor a failure to log', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });

    const result = await fcmPush.send(['good-token'], notice);

    expect(result.staleTokens).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ])('reports a %s token as stale, and does not log it as a failure', async (code) => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    sendEachForMulticast.mockResolvedValue({
      responses: [{ success: false, error: { code } }],
    });

    const result = await fcmPush.send(['stale-token'], notice);

    expect(result.staleTokens).toEqual(['stale-token']);
    expect(warn).not.toHaveBeenCalled();
  });

  it('logs any other per-token failure instead of dropping it silently', async () => {
    // This is the actual bug: sendEachForMulticast never throws for a
    // per-token failure, so anything that isn't one of the two "stale"
    // codes above used to vanish completely — not stale, not thrown, not
    // caught, not logged. A real send failure looked identical to success.
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        {
          success: false,
          error: {
            code: 'messaging/internal-error',
            message: 'Something went wrong upstream',
          },
        },
      ],
    });

    const result = await fcmPush.send(['bad-token'], notice);

    expect(result.staleTokens).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      'FCM send failed for a token',
      expect.objectContaining({
        code: 'messaging/internal-error',
        message: 'Something went wrong upstream',
      }),
    );
  });

  it('handles a mixed batch correctly: success, stale, and a real failure together', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/invalid-registration-token' } },
        { success: false, error: { code: 'messaging/quota-exceeded' } },
      ],
    });

    const result = await fcmPush.send(
      ['good-token', 'stale-token', 'quota-token'],
      notice,
    );

    expect(result.staleTokens).toEqual(['stale-token']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'FCM send failed for a token',
      expect.objectContaining({ code: 'messaging/quota-exceeded' }),
    );
  });

  it('logs every send, success included, with a per-token outcome but never a whole token', async () => {
    // Without a line for a successful send, "FCM accepted it and the phone
    // dropped it" looks identical to "nothing was ever sent".
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true, messageId: 'projects/p/messages/1' },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: false, error: { code: 'messaging/quota-exceeded', message: 'slow down' } },
      ],
    });

    const result = await fcmPush.send(
      ['good-token-0001', 'stale-token-0002', 'quota-token-0003'],
      notice,
    );

    expect(result.results).toEqual([
      { token: '…ken-0001', outcome: 'sent', messageId: 'projects/p/messages/1' },
      {
        token: '…ken-0002',
        outcome: 'stale',
        code: 'messaging/registration-token-not-registered',
      },
      {
        token: '…ken-0003',
        outcome: 'failed',
        code: 'messaging/quota-exceeded',
        message: 'slow down',
      },
    ]);
    expect(info).toHaveBeenCalledWith(
      'FCM send result',
      expect.objectContaining({ tokenCount: 3, sent: 1, stale: 1, failed: 1 }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain('good-token-0001');
  });
});
