import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions';
import {
  getDatabase,
  connectDatabaseEmulator,
  type Database,
} from 'firebase/database';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const app: FirebaseApp = initializeApp(config);
export const auth: Auth = getAuth(app);

/**
 * Persistent cache, not the default in-memory one.
 *
 * A till that loses its network has to keep serving from the queue it already
 * has (PRD 6), and that is only possible if reads survive without a
 * connection. Multi-tab support because a shop may have the serving screen and
 * the monitor open on the same device.
 */
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const functions: Functions = getFunctions(app);

/**
 * Realtime Database is used **only** for shop heartbeat/presence — Firestore
 * has no native presence. Nothing else belongs here. See CLAUDE.md.
 */
export const presenceDb: Database = getDatabase(app);

const useEmulators = import.meta.env.VITE_USE_EMULATORS !== 'false';

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectDatabaseEmulator(presenceDb, '127.0.0.1', 9000);
}
