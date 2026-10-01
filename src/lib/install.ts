import { isStandalone } from './platform.js';

/**
 * Installing Qjume as an app, and knowing whether it already is.
 *
 * Push from a site that is not installed is shown on Android as coming from
 * "Chrome", and Chrome is free to quiet or hide it as possible spam. An
 * installed app's notifications are its own. So turning notifications on is
 * the moment to suggest installing — but only to someone who hasn't.
 */

/** Chrome's install prompt event. Not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface RelatedApp {
  platform: string;
  url?: string;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisVisit = false;
const listeners = new Set<() => void>();

function changed() {
  for (const listener of listeners) listener();
}

// Chrome fires this once, early, and only while the app is *not* installed —
// so it has to be caught at startup, long before anyone taps anything.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    installedThisVisit = true;
    deferredPrompt = null;
    changed();
  });
}

/** Re-render when install state changes. Returns an unsubscribe function. */
export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether Qjume is installed on this device, as best the browser will say.
 *
 * Running standalone settles it. From a browser tab, Chrome on Android can
 * answer through `getInstalledRelatedApps`, which works because the manifest
 * lists the app itself under `related_applications`. Anywhere that API is
 * missing, an offered install prompt still means "not installed"; with
 * neither, the answer is "not installed", since suggesting an install to
 * someone who has one costs a sentence and missing it costs alerts.
 */
export async function isInstalled(): Promise<boolean> {
  if (isStandalone() || installedThisVisit) return true;
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };
  if (nav.getInstalledRelatedApps) {
    try {
      const apps = await nav.getInstalledRelatedApps();
      if (apps.some((app) => app.platform === 'webapp')) return true;
    } catch {
      // Treated as unknown, below.
    }
  }
  return false;
}

/** True when the browser will show its own install dialog on request. */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/** Show the browser's install dialog. Must be called from a tap. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  changed();
  return outcome === 'accepted';
}
