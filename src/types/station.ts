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
   * Whether this station is serving right now. Set only by
   * `startServing`/`stopServing` — never assumed from a device's connection
   * state. Starting is triggered by arriving at the Serve screen with a
   * station chosen (ServingScreen.tsx), which is a deliberate action, not
   * ambient presence; but the asymmetry that matters is on the other side:
   * closing the tab or locking the phone never stops it. Only an explicit
   * "Stop serving" tap, or the abandoned-queue sweep giving up on it after a
   * long silence, does. See `nextStatusForServing` in
   * `src/lib/queue/presence.ts`.
   */
  serving: boolean;
}
