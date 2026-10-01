import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
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
 * Where the push worker lives — deliberately not `/`.
 *
 * The PWA's own Workbox worker (`sw.js`, vite-plugin-pwa) is registered at `/`
 * on every page load. A second worker registered at the same scope is not a
 * second worker: it replaces the first, and the next page load puts `sw.js`
 * back. The push subscription belongs to the registration, not the script, so
 * the token stayed valid and FCM kept accepting sends — but the push event
 * then landed in a worker with no push handler, and nothing appeared. This is
 * the scope the Firebase SDK itself uses when it registers its own worker.
 */
const PUSH_SCOPE = '/firebase-cloud-messaging-push-scope';

function registerPushWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }).toString()}`,
    { scope: PUSH_SCOPE },
  );
}

let foregroundListening = false;

/**
 * Show pushes that arrive while the app is open and visible.
 *
 * FCM hands a message to the open page instead of to the service worker when
 * a page is in the foreground, and shows nothing itself — so a customer
 * watching their place in line, which is exactly who is about to be called,
 * got no alert at all. Shown through the worker's registration because Chrome
 * on Android does not allow `new Notification()` from a page.
 */
function listenInForeground(registration: ServiceWorkerRegistration): void {
  if (foregroundListening) return;
  foregroundListening = true;
  onMessage(getMessaging(app), (payload) => {
    const { title, body } = payload.notification ?? {};
    if (!title) return;
    void registration.showNotification(title, {
      body: body ?? '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      data: { url: payload.fcmOptions?.link ?? '/' },
      // Same tag as the server-shown alerts, so each replaces the last — and
      // renotify, so a replacement still buzzes instead of arriving silently.
      ...(payload.fcmOptions?.link
        ? { tag: payload.fcmOptions.link, renotify: true }
        : {}),
      // Being called: keep it up until dismissed, even with the app open —
      // the screen saying so is no help to someone not looking at it.
      requireInteraction: payload.data?.['urgent'] === '1',
    });
  });
}

/**
 * Re-attach the foreground listener after a reload, when permission was
 * already granted. Safe to call on every mount; does nothing otherwise.
 */
export async function resumeForegroundPush(): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!(await isSupported().catch(() => false))) return;
  const registration = await navigator.serviceWorker.getRegistration(PUSH_SCOPE);
  if (registration) listenInForeground(registration);
}

/**
 * Per ticket, whether this device turned push on — so coming back to the
 * ticket shows "Disable notifications" rather than asking again. Kept on the
 * device because the token list is server-only, and per ticket because one
 * phone can hold tickets in two queues and turn alerts off for just one.
 */
const pushKey = (ticketId: string) => `qjume.push.${ticketId}`;

export function rememberPush(ticketId: string, on: boolean): void {
  try {
    if (on) window.localStorage.setItem(pushKey(ticketId), 'on');
    else window.localStorage.removeItem(pushKey(ticketId));
  } catch {
    // Storage blocked: the button just asks again next visit.
  }
}

export function pushRemembered(ticketId: string): boolean {
  try {
    return window.localStorage.getItem(pushKey(ticketId)) === 'on';
  } catch {
    return false;
  }
}

/**
 * This device's current token, without prompting — only once permission is
 * already granted. Tokens rotate, so a returning visit re-reads it rather than
 * trusting the one it registered last time.
 */
export async function currentPushToken(): Promise<string | null> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  if (!(await isSupported().catch(() => false))) return null;
  const registration = await registerPushWorker();
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  listenInForeground(registration);
  return token || null;
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

  const registration = await registerPushWorker();

  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  listenInForeground(registration);
  return token || null;
}
