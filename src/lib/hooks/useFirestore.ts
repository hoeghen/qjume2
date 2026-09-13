import { useEffect, useState } from 'react';
import {
  onSnapshot,
  type DocumentReference,
  type Query,
} from 'firebase/firestore';
import { demoStore } from '../demo/store.js';

export interface Loadable<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * A demo reference carries only its path; the store needs nothing else.
 * Shaped like a Firestore reference so callers cannot tell the difference.
 */
export interface DemoRef {
  readonly __demoPath: string;
  readonly path: string;
}

export function demoRef(path: string): DemoRef {
  return { __demoPath: path, path };
}

function pathOf(ref: unknown): string | null {
  return (ref as DemoRef | null)?.__demoPath ?? null;
}

/** Live subscription to one document. */
export function useDoc<T>(
  ref: DocumentReference<T> | DemoRef | null,
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

    const demoPath = pathOf(ref);
    if (demoPath !== null) {
      const read = () =>
        setState({
          data: demoStore.get<T>(demoPath),
          loading: false,
          error: null,
        });
      read();
      return demoStore.subscribe(read);
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
 * A demo query: a collection path plus the filtering the real query expressed
 * in Firestore terms. Applied in memory, over a handful of documents.
 */
export interface DemoQuery extends DemoRef {
  readonly where?: (row: Record<string, unknown>) => boolean;
  readonly sortBy?: string;
  readonly max?: number;
}

export function demoQuery(
  path: string,
  options: Omit<DemoQuery, '__demoPath' | 'path'> = {},
): DemoQuery {
  return { __demoPath: path, path, ...options };
}

/** Live subscription to a query, with document ids attached. */
export function useCollection<T>(
  query: Query<T> | DemoQuery | null,
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

    const demoPath = pathOf(query);
    if (demoPath !== null) {
      const q = query as DemoQuery;
      const read = () => {
        let rows = demoStore.list<T>(demoPath) as (T & WithId)[];
        if (q.where) {
          rows = rows.filter((row) =>
            q.where!(row as unknown as Record<string, unknown>),
          );
        }
        if (q.sortBy) {
          const key = q.sortBy;
          rows = [...rows].sort(
            (a, b) =>
              Number((a as Record<string, unknown>)[key]) -
              Number((b as Record<string, unknown>)[key]),
          );
        }
        if (q.max !== undefined) rows = rows.slice(0, q.max);
        setState({ data: rows, loading: false, error: null });
      };
      read();
      return demoStore.subscribe(read);
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
