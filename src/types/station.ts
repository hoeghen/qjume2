/**
 * A serving position within a queue ("Till 2"). Staff pick a station identity
 * at the start of a shift. Several can serve one queue at once, on every plan.
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
  /**
   * The device that has this till open on its serve screen, or null. Per
   * device, not per person: one owner signed in on a PC and a phone is one
   * `activeStaffUid` but two devices. Set by `claimStation` (which also lets
   * go of any other till this device held in the queue), cleared by
   * `releaseStation` on "Skift kasse" and by the abandoned-queue sweep.
   * `deleteStation` refuses a till another device holds unless told to go
   * ahead anyway. Absent on tills from before it existed.
   */
  activeDeviceId?: string | null;
}
