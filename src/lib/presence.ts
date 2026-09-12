import {
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database';
import { presenceDb } from './firebase.js';

/**
 * Tell the server this device is serving a queue, and — more importantly —
 * arrange for it to be told when this device stops.
 *
 * `onDisconnect` is registered on the server the moment we connect, so it
 * fires even when a tablet is unplugged mid-shift and gets no chance to say
 * goodbye. That is the whole reason Realtime Database is in this project at
 * all: Firestore cannot tell a closed tab from a dead network.
 */
export function announcePresence(
  shopId: string,
  queueId: string,
  stationId: string,
): () => void {
  const connectionId = `${stationId}-${Math.random().toString(36).slice(2, 10)}`;
  const here = ref(presenceDb, `status/${shopId}/${queueId}/${connectionId}`);
  const connected = ref(presenceDb, '.info/connected');

  const stop = onValue(connected, (snapshot) => {
    if (snapshot.val() !== true) return;
    // Registered before the write, so a disconnect between the two still
    // leaves the queue correctly marked offline.
    void onDisconnect(here)
      .remove()
      .then(() => set(here, { at: serverTimestamp(), stationId }));
  });

  return () => {
    stop();
    void onDisconnect(here).cancel();
    void remove(here);
  };
}

/** Whether this device currently has a connection to the backend. */
export function watchConnection(fn: (online: boolean) => void): () => void {
  return onValue(ref(presenceDb, '.info/connected'), (snapshot) => {
    fn(snapshot.val() === true);
  });
}
