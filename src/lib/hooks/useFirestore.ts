import { useEffect, useState } from 'react';
import {
  onSnapshot,
  type DocumentReference,
  type Query,
} from 'firebase/firestore';
import { mockStore } from '../mock/store.js';

export interface Loadable<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * A mock reference carries only its path; the store needs nothing else.
 * Shaped like a Firestore reference so callers cannot tell the difference.
 */
export interface MockRef {
  readonly __mockPath: string;
  readonly path: string;
}

export function mockRef(path: string): MockRef {
  return { __mockPath: path, path };
}

function pathOf(ref: unknown): string | null {
  return (ref as MockRef | null)?.__mockPath ?? null;
}

/** Live subscription to one document. */
export function useDoc<T>(
  ref: DocumentReference<T> | MockRef | null,
): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const path = ref?.path ?? null;

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const mockPath = pathOf(ref);
    if (mockPath !== null) {
      const read = () =>
        setState({
          data: mockStore.get<T>(mockPath),
          loading: false,
          error: null,
        });
      read();
      return mockStore.subscribe(read);
    }

    setState({ data: null, loading: true, error: null });
    return onSnapshot(
      ref as DocumentReference<T>,
      (snap) =>
        setState({ data: snap.data() ?? null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // `path` identifies the document; the ref object itself is recreated on
    // every render and would restart the subscription each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return state;
}

export interface WithId {
  id: string;
}

/**
 * A mock query: a collection path plus the filtering the real query expressed
 * in Firestore terms. Applied in memory, over a handful of documents.
 */
export interface MockQuery extends MockRef {
  readonly where?: (row: Record<string, unknown>) => boolean;
  readonly sortBy?: string;
  /** Newest/highest first. Default is ascending, matching `orderBy` alone. */
  readonly sortDesc?: boolean;
  readonly max?: number;
}

export function mockQuery(
  path: string,
  options: Omit<MockQuery, '__mockPath' | 'path'> = {},
): MockQuery {
  return { __mockPath: path, path, ...options };
}

/** Live subscription to a query, with document ids attached. */
export function useCollection<T>(
  query: Query<T> | MockQuery | null,
  /** Changes to this string restart the subscription. */
  key: string,
): Loadable<(T & WithId)[]> {
  const [state, setState] = useState<Loadable<(T & WithId)[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const mockPath = pathOf(query);
    if (mockPath !== null) {
      const q = query as MockQuery;
      const read = () => {
        let rows = mockStore.list<T>(mockPath) as (T & WithId)[];
        if (q.where) {
          rows = rows.filter((row) =>
            q.where!(row as unknown as Record<string, unknown>),
          );
        }
        if (q.sortBy) {
          const key = q.sortBy;
          const direction = q.sortDesc ? -1 : 1;
          rows = [...rows].sort((a, b) => {
            const av = (a as Record<string, unknown>)[key];
            const bv = (b as Record<string, unknown>)[key];
            // Firestore's orderBy compares like-typed values; a shop's `name`
            // is the one field sorted here that isn't already a number.
            const cmp =
              typeof av === 'string' && typeof bv === 'string'
                ? av.localeCompare(bv)
                : Number(av) - Number(bv);
            return direction * cmp;
          });
        }
        if (q.max !== undefined) rows = rows.slice(0, q.max);
        setState({ data: rows, loading: false, error: null });
      };
      read();
      return mockStore.subscribe(read);
    }

    setState({ data: null, loading: true, error: null });
    return onSnapshot(
      query as Query<T>,
      (snap) =>
        setState({
          data: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
          error: null,
        }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
