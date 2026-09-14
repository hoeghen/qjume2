/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_VAPID_KEY: string;
  readonly VITE_USE_EMULATORS?: string;
  /** "true" builds the no-backend demo. See src/lib/demo/. */
  readonly VITE_DEMO?: string;
  /**
   * "true" builds for an unknown path on a static host with no rewrite rules:
   * hash routing, relative asset paths, no service worker.
   */
  readonly VITE_PORTABLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
