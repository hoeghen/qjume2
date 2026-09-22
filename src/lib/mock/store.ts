/**
 * A document store with Firestore's shape, running in the browser.
 *
 * Qjume's server exists almost entirely for trust — stopping a customer
 * advancing their own ticket, counting a shop's queues against its plan. With
 * the whole database on one device there is no trust boundary to defend:
 * nobody can cheat a queue that only exists on their own phone. So this
 * implements the storage and leaves the enforcement to the server build.
 *
 * Ordering comes from `src/lib/queue/`, the same modules the Cloud Functions
 * use, so the two cannot disagree about who is next.
 *
 * Writes persist to localStorage. A queue you joined has to survive a refresh
 * and a phone locking itself — a ticket that evaporates is not a ticket.
 */
/*
 * Bumped when the seed's shape changes in a way a stored copy cannot be read
 * back into. v2 gave the seeded shops stable ids, which a store written by v1
 * does not have — and a join code that resolves on one device and not another
 * is worse than starting over.
 */
const STORAGE_KEY = 'qjume.store.v2';

/**
 * Storage can throw rather than merely be empty: Safari in private mode, a
 * browser with site data blocked, an embedded webview. None of that should
 * stop the app running, so every access is guarded and failure just means
 * this session keeps its data in memory.
 */
function readStored(): [string, Row][] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as [string, Row][]) : null;
  } catch {
    return null;
  }
}
export type Listener = () => void;

type Row = Record<string, unknown>;

export class MockStore {
  /** Keyed by full path, e.g. `shops/s1/queues/q1/tickets/t1`. */
  private readonly docs: Map<string, Row>;
  private readonly listeners = new Set<Listener>();
  /** True once anything has been loaded or written, so seeding runs once. */
  readonly restored: boolean;

  constructor() {
    const stored = readStored();
    this.docs = new Map(stored ?? []);
    this.restored = stored !== null && stored.length > 0;
  }

  /** Throws away everything, including what was persisted. */
  reset(): void {
    this.docs.clear();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was persisted, so nothing to clear.
    }
    this.emit();
  }

  get<T>(path: string): T | null {
    const row = this.docs.get(path);
    return row ? ({ ...row } as T) : null;
  }

  set(path: string, value: Row): void {
    this.docs.set(path, { ...value });
    this.emit();
  }

  update(path: string, patch: Row): void {
    const existing = this.docs.get(path);
    if (!existing) return;
    this.docs.set(path, { ...existing, ...patch });
    this.emit();
  }

  delete(path: string): void {
    this.docs.delete(path);
    this.emit();
  }

  /**
   * A document and everything nested under it — a shop's queues, their
   * tickets and stations, its staff. The mirror of the Admin SDK's
   * `recursiveDelete`, which is what `adminDeleteShop` uses for real; the
   * mock has no subcollections to walk, only path prefixes to match.
   */
  deletePrefix(path: string): void {
    const nested = `${path}/`;
    for (const key of this.docs.keys()) {
      if (key === path || key.startsWith(nested)) this.docs.delete(key);
    }
    this.emit();
  }

  /** Every document directly inside a collection path, with its id. */
  list<T>(collectionPath: string): (T & { id: string })[] {
    const prefix = `${collectionPath}/`;
    const out: (T & { id: string })[] = [];
    for (const [path, row] of this.docs) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      // Direct children only: a deeper path has another slash in it.
      if (rest.includes('/')) continue;
      out.push({ ...(row as T), id: rest });
    }
    return out;
  }

  /**
   * Every document in any collection with this name, at any depth — the
   * equivalent of a Firestore collection group query, which discovery needs to
   * search across all shops.
   */
  listGroup<T>(collectionName: string): (T & { id: string; path: string })[] {
    const out: (T & { id: string; path: string })[] = [];
    for (const [path, row] of this.docs) {
      const parts = path.split('/');
      if (parts.length < 2) continue;
      if (parts[parts.length - 2] !== collectionName) continue;
      out.push({
        ...(row as T),
        id: parts[parts.length - 1] as string,
        path,
      });
    }
    return out;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.persist();
    for (const listener of this.listeners) listener();
  }

  private persist(): void {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...this.docs.entries()]),
      );
    } catch {
      // Quota, private mode, or blocked site data. The store still works for
      // this session; it just will not outlive the tab.
    }
  }
}

export const mockStore = new MockStore();

/**
 * Short, readable ids.
 *
 * The counter restarts at zero on every load, so it alone would reissue an id
 * that is already in the store — the timestamp suffix is what keeps a ticket
 * minted today from colliding with one minted before the last refresh.
 */
let counter = 0;
export function mockId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}${counter}-${Date.now().toString(36)}`;
}
