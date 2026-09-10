/**
 * A serving position within a queue ("Till 2"). Staff pick a station identity
 * at the start of a shift. Parallel stations are a paid feature; the free tier
 * is one server at a time.
 */
export interface Station {
  label: string;
  activeStaffUid: string | null;
  currentTicketId: string | null;
}
