import { initializeApp, type FirebaseApp } from 'firebase/app';
import { isDemo } from './demo/mode.js';
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

/**
 * A demo build has no Firebase project, and initialising the SDK without one
 * throws `auth/invalid-api-key` while this module is still evaluating. That
 * kills the bundle before React mounts, so the page goes blank with the real
 * cause buried in the console.
 *
 * A local build hides it: a .env with placeholder values is enough for the SDK
 * to construct. .env is gitignored, so the failure only appears where no .env
 * exists — which is CI, and therefore only ever in the deployed site.
 *
 * Every caller already branches on `isDemo`, so nothing should reach one of
 * these. If something does, name it here rather than fail later as an
 * undefined property.
 */
function absentInDemo<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get() {
      throw new Error(
        `Firebase ${name} was used in a demo build, which has no project ` +
          'to talk to. That code path needs an isDemo branch.',
      );
    },
  });
}

export const app: FirebaseApp = isDemo
  ? absentInDemo('app')
  : initializeApp(config);
export const auth: Auth = isDemo ? absentInDemo('auth') : getAuth(app);

/**
 * Persistent cache, not the default in-memory one.
 *
 * A till that loses its network has to keep serving from the queue it already
 * has (PRD 6), and that is only possible if reads survive without a
 * connection. Multi-tab support because a shop may have the serving screen and
 * the monitor open on the same device.
 */
export const db: Firestore = isDemo
  ? absentInDemo('db')
  : initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
export const functions: Functions = isDemo
  ? absentInDemo('functions')
  : getFunctions(app);

/**
 * Realtime Database is used **only** for shop heartbeat/presence — Firestore
 * has no native presence. Nothing else belongs here. See CLAUDE.md.
 */
export const presenceDb: Database = isDemo
  ? absentInDemo('presenceDb')
  : getDatabase(app);

const useEmulators = import.meta.env.VITE_USE_EMULATORS !== 'false';

// The demo has no backend to connect to, and pointing the SDK at emulators
// that are not there would leave every read hanging.
if (useEmulators && !isDemo) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectDatabaseEmulator(presenceDb, '127.0.0.1', 9000);
}
