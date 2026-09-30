import { onValue, ref } from 'firebase/database';
import { presenceDb } from './firebase.js';
import { isMock } from './mock/mode.js';

/**
 * Whether this device currently has a connection to the backend.
 *
 * This is this device's own connectivity only — used to decide whether a
 * Serve-screen tap can reach `callNext` right now or has to be queued and
 * replayed later (`useOfflineServing`). It has nothing to do with whether the
 * *queue* is publicly available: that is driven by explicit
 * `startServing`/`stopServing` calls, not by this connection.
 *
 * Realtime Database's `.info/connected` is used rather than
 * `navigator.onLine` because it reflects actual reachability to Firebase, not
 * just whether the network adapter is up.
 */
export function watchConnection(fn: (online: boolean) => void): () => void {
  if (isMock) {
    // The mock backend is always "online": everything it needs is on this device.
    fn(true);
    return () => undefined;
  }
  return onValue(ref(presenceDb, '.info/connected'), (snapshot) => {
    fn(snapshot.val() === true);
  });
}
