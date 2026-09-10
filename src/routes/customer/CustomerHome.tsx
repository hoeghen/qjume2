import { useEffect, useMemo, useState } from 'react';
import {
  applyFilters,
  findQueuesNear,
  type DiscoveredQueue,
  type Filters as FilterState,
} from '../../lib/discovery.js';
import { useGeolocation } from '../../lib/hooks/useGeolocation.js';
import { messageOf } from '../../lib/functions.js';
import { Filters } from './components/Filters.js';
import { QueueCard } from './components/QueueCard.js';

const DEFAULTS: FilterState = {
  radiusKm: 5,
  category: 'all',
  status: 'active',
  search: '',
  sort: 'distance',
};

export function CustomerHome() {
  const { coords, status: locationStatus, request } = useGeolocation();
  const [filters, setFilters] = useState<FilterState>(DEFAULTS);
  const [queues, setQueues] = useState<DiscoveredQueue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocation = coords !== null;
  // Distinct from "no coordinates yet": the browser takes a moment to answer,
  // and treating that pause as a refusal would silently drop distance sorting
  // for everyone who grants permission.
  const noLocationPossible =
    locationStatus === 'denied' || locationStatus === 'unavailable';

  // Only the radius round-trips to Firestore. Category, status, sort and search
  // are applied to the results already in hand.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    findQueuesNear(coords, filters.radiusKm)
      .then((found) => {
        if (!cancelled) setQueues(found);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(messageOf(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coords, filters.radiusKm]);

  // Distance sorting is meaningless without a location; fall back to name so
  // the list still has a sensible order.
  useEffect(() => {
    if (noLocationPossible && filters.sort === 'distance') {
      setFilters((f) => ({ ...f, sort: 'name' }));
    }
  }, [noLocationPossible, filters.sort]);

  const visible = useMemo(
    () => (queues ? applyFilters(queues, filters) : []),
    [queues, filters],
  );

  return (
    <main>
      <h1>Find a queue</h1>

      <Filters
        value={filters}
        onChange={setFilters}
        canUseDistance={!noLocationPossible}
      />

      {locationStatus === 'denied' && (
        <p className="notice">
          Location is off, so distances are hidden.{' '}
          <button type="button" className="link" onClick={request}>
            Try again
          </button>
        </p>
      )}
      {locationStatus === 'unavailable' && (
        <p className="notice">
          This device cannot share a location, so distances are hidden.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {locationStatus === 'locating' && !queues && <p>Finding queues near you…</p>}
      {loading && queues && <p className="muted">Updating…</p>}

      {queues && visible.length === 0 && !loading && (
        <p className="muted">
          {queues.length === 0
            ? 'No queues within this distance. Try a wider search.'
            : 'No queues match these filters.'}
        </p>
      )}

      <ul className="queue-cards">
        {visible.map((q) => (
          <QueueCard key={`${q.shopId}/${q.id}`} queue={q} showDistance={hasLocation} />
        ))}
      </ul>
    </main>
  );
}
