export interface CustomerHistoryEntry {
  shopId: string;
  queueId: string;
  joinedAt: number;
}

export interface Customer {
  /** Doubles as a favourites list for quick rejoining. PRD 4.7. */
  history: CustomerHistoryEntry[];
}
