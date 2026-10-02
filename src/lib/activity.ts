/**
 * A spinner on the button that started a server call, for every such button.
 *
 * Rather than every component remembering to swap its label for a spinner,
 * the few places a call to the server starts — the Cloud Function wrappers,
 * the two direct Firestore writes, sign-in, the discovery reads — wrap their
 * promise in `track`. A capture listener remembers which button was pressed
 * (or submitted a form); a call starting shortly after marks that button
 * `aria-busy="true"` until every call it started settles. index.css draws
 * the spinner from that attribute, and screen readers hear "busy" for free.
 */

/** How long after a press a call still counts as started by it. */
const PRESS_WINDOW_MS = 1500;
/**
 * Never spin longer than this. A Firestore write made offline resolves only
 * on reconnect — correct, since the shop device keeps serving from cache
 * (invariant 4) — but a spinner for that long would read as broken.
 */
const MAX_SPIN_MS = 10_000;

let lastPressed: { el: HTMLElement; at: number } | null = null;
const inFlight = new WeakMap<HTMLElement, number>();

function remember(el: Element | null | undefined): void {
  const button = el?.closest('button, [role="button"], a.button');
  if (button instanceof HTMLElement) lastPressed = { el: button, at: Date.now() };
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => remember(e.target as Element), true);
  document.addEventListener(
    'submit',
    (e) => remember((e as SubmitEvent).submitter ?? (e.target as HTMLFormElement).querySelector('[type="submit"]')),
    true,
  );
}

function begin(el: HTMLElement): void {
  inFlight.set(el, (inFlight.get(el) ?? 0) + 1);
  el.setAttribute('aria-busy', 'true');
}

function end(el: HTMLElement): void {
  const left = (inFlight.get(el) ?? 1) - 1;
  inFlight.set(el, Math.max(0, left));
  if (left <= 0) el.removeAttribute('aria-busy');
}

/** Show a spinner on the pressed button while `promise` runs. Returns it unchanged. */
export function track<T>(promise: Promise<T>): Promise<T> {
  const pressed = lastPressed;
  if (!pressed || Date.now() - pressed.at > PRESS_WINDOW_MS || !pressed.el.isConnected) {
    return promise;
  }
  const el = pressed.el;
  begin(el);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    end(el);
  };
  const cap = setTimeout(finish, MAX_SPIN_MS);
  void promise.then(finish, finish).finally(() => clearTimeout(cap));
  return promise;
}
