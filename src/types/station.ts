/**
 * A serving position within a queue ("Till 2"). Staff pick a station identity
 * at the start of a shift. Parallel stations are a paid feature; the free tier
 * is one server at a time.
 */
export interface Station {
  label: string;
  activeStaffUid: string | null;
  currentTicketId: string | null;
  /**
   * Whether staff have explicitly said this station is serving right now.
   * Set only by `startServing`/`stopServing` — never announced implicitly by
   * the Serve screen being open, and never assumed from a device's connection
   * state. Closing the tab or locking the phone leaves it untouched; only an
   * explicit tap, or the abandoned-queue sweep giving up on it after a long
   * silence, changes it. See `nextStatusForServing` in `src/lib/queue/presence.ts`.
   */
  serving: boolean;
}
