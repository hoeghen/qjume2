import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './firebase.js';
import { isIos, isStandalone } from './platform.js';

export type PushAvailability =
  | 'ready'
  | 'needs-install'
  | 'denied'
  | 'unsupported';

/**
 * Whether asking for push permission would achieve anything.
 *
 * On iOS, web push reaches only a PWA that has been added to the Home Screen.
 * Prompting from a Safari tab there is worse than useless: the customer either
 * sees nothing or refuses a prompt they cannot act on, and a refusal sticks.
 * So an uninstalled iOS browser is told to install first, not asked.
 */
export async function pushAvailability(): Promise<PushAvailability> {
  if (!('Notification' in window)) return 'unsupported';
  if (!(await isSupported().catch(() => false))) return 'unsupported';
  if (isIos() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

/**
 * Ask for permission and return a token.
 *
 * Must be called from a user gesture — iOS requires it, and every other
 * browser treats an unprompted request as a reason to distrust the site.
 */
export async function enablePush(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }).toString()}`,
  );

  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}
