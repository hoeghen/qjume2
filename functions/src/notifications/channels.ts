/**
 * How a customer is told something.
 *
 * Push is preferred and email is the fallback, but the ordering is not the
 * important part: on iOS, web push only reaches a PWA installed to the Home
 * Screen, so a large share of customers will never receive one at all. Email
 * is not a degraded path for them — it is the only path. See CLAUDE.md.
 *
 * Neither channel is where anything critical lives. The live position screen
 * is what a customer can always open, and it carries the product on its own.
 */
export interface Notice {
  title: string;
  body: string;
  /** Deep link to the ticket this is about. */
  url: string;
}

export interface PushChannel {
  readonly name: string;
  /** Returns the tokens that are no longer valid and should be forgotten. */
  send(tokens: string[], notice: Notice): Promise<{ staleTokens: string[] }>;
}

export interface EmailChannel {
  readonly name: string;
  send(to: string, notice: Notice): Promise<void>;
}

export interface Channels {
  push: PushChannel;
  email: EmailChannel;
}

/** Records what would have been sent. Used by tests and local development. */
export interface RecordedNotice extends Notice {
  channel: 'push' | 'email';
  to: string;
}

export function recordingChannels(sink: RecordedNotice[]): Channels {
  return {
    push: {
      name: 'recording',
      async send(tokens, notice) {
        for (const to of tokens) sink.push({ ...notice, channel: 'push', to });
        return { staleTokens: [] };
      },
    },
    email: {
      name: 'recording',
      async send(to, notice) {
        sink.push({ ...notice, channel: 'email', to });
      },
    },
  };
}
