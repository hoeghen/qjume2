/**
 * Getting a new version onto a phone whose app never reloads.
 *
 * `skipWaiting`/`clientsClaim` (vite.config.ts) make a new service worker
 * take over at once, but two gaps remained. The browser only looks for a new
 * worker when a page is loaded from scratch, which an installed app left open
 * in the background almost never does. And a page already running keeps its
 * old JavaScript even once the new worker controls it. So a fix could be
 * live for days while a shop's phone went on running the code it replaced.
 *
 * So: look for an update every time the app comes back to the front, and
 * once a new version has taken over, reload — straight away unless someone is
 * typing or has a dialog open, otherwise the next time the app is put away,
 * so nobody loses half a form to it.
 */
function busy(): boolean {
  const el = document.activeElement;
  const typing =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement;
  return typing || document.querySelector('[role="dialog"]') !== null;
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // The very first install also changes the controller, but to the same code
  // this page is already running; only a replacement is an update.
  let controlled = navigator.serviceWorker.controller !== null;
  let updated = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    updated = true;
    if (document.visibilityState === 'hidden' || !busy()) window.location.reload();
  });

  const check = () => {
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {
        // Offline, most likely; the next check tries again.
      });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (updated) window.location.reload();
      return;
    }
    check();
  });

  // A screen that is never put away — the PC at the counter, the monitor on
  // the wall — never comes back to the front either, so it also checks on a
  // timer. Its reload then waits only for nobody to be typing.
  window.setInterval(() => {
    if (updated && !busy()) window.location.reload();
    else check();
  }, 30 * 60 * 1000);
}

export {};
