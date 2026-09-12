import { useEffect, useState } from 'react';
import {
  onSnapshot,
  type DocumentReference,
  type Query,
} from 'firebase/firestore';

export interface Loadable<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Live subscription to one document. */
export function useDoc<T>(ref: DocumentReference<T> | null): Loadable<T> {
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
    setState({ data: null, loading: true, error: null });
    return onSnapshot(
      ref,
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

/** Live subscription to a query, with document ids attached. */
export function useCollection<T>(
  query: Query<T> | null,
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
    setState({ data: null, loading: true, error: null });
    return onSnapshot(
      query,
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
