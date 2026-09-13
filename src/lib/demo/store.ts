/**
 * An in-memory stand-in for Firestore, for the demo build.
 *
 * Qjume normally needs a Firestore and seventeen Cloud Functions. Most of that
 * server exists for trust — stopping a customer advancing their own ticket,
 * counting a shop's queues against its plan. A demo has no trust boundary:
 * every byte lives in one browser tab and nobody can cheat a queue that only
 * exists on their own phone. So the demo drops the server entirely.
 *
 * Ordering still comes from `src/lib/queue/`, the same modules the real Cloud
 * Functions use, so the two cannot disagree about who is next.
 */
export type Listener = () => void;

type Row = Record<string, unknown>;

export class DemoStore {
  /** Keyed by full path, e.g. `shops/s1/queues/q1/tickets/t1`. */
  private readonly docs = new Map<string, Row>();
  private readonly listeners = new Set<Listener>();

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
    for (const listener of this.listeners) listener();
  }
}

export const demoStore = new DemoStore();

/** Short, readable ids — this data is never leaving the tab. */
let counter = 0;
export function demoId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}${counter}`;
}
