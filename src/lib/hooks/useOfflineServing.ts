import { useCallback, useEffect, useRef, useState } from 'react';
import { announcePresence, watchConnection } from '../presence.js';
import {
  pendingFor,
  recordAdvance,
  replayAdvances,
} from '../offline/pendingAdvances.js';
import { callNext } from '../functions.js';

export interface OfflineServing {
  online: boolean;
  /** Advances taken offline and not yet replayed. */
  pending: number;
  /** How many the till has moved past locally while offline. */
  localOffset: number;
  advance: (outcome: 'served' | 'noShow') => void;
}

/**
 * Keeps a till serving through a network drop.
 *
 * While offline the device cannot call `callNext`, so the tap is recorded and
 * the screen moves on using its cached copy of the queue. On reconnect the
 * recorded taps are replayed in order, and the local offset is dropped once
 * the server catches up. Nothing here writes ticket state — that stays
 * server-only (invariant 1).
 */
export function useOfflineServing(
  shopId: string,
  queueId: string,
  stationId: string | null,
): OfflineServing {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(() =>
    shopId && queueId ? pendingFor(shopId, queueId).length : 0,
  );
  const [localOffset, setLocalOffset] = useState(0);
  const replaying = useRef(false);

  // Announce this device while it is serving, so the server can mark the queue
  // unavailable the moment it vanishes.
  useEffect(() => {
    if (!shopId || !queueId || !stationId) return;
    return announcePresence(shopId, queueId, stationId);
  }, [shopId, queueId, stationId]);

  useEffect(() => watchConnection(setOnline), []);

  useEffect(() => {
    if (!online || replaying.current || pending === 0) return;
    replaying.current = true;

    void replayAdvances((a) =>
      callNext({
        shopId: a.shopId,
        queueId: a.queueId,
        stationId: a.stationId,
        ...(a.outcome === 'noShow' ? { outcome: a.outcome } : {}),
      }),
    )
      .then((result) => {
        setPending(result.remaining);
        // Only once the server has caught up does the local view stop being
        // ahead of it.
        if (result.remaining === 0) setLocalOffset(0);
      })
      .finally(() => {
        replaying.current = false;
      });
  }, [online, pending]);

  const advance = useCallback(
    (outcome: 'served' | 'noShow') => {
      if (!stationId) return;
      recordAdvance({ shopId, queueId, stationId, outcome, at: Date.now() });
      setPending((n) => n + 1);
      setLocalOffset((n) => n + 1);
    },
    [shopId, queueId, stationId],
  );

  return { online, pending, localOffset, advance };
}
