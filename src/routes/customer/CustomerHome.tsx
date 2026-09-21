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

/**
 * How far the query reaches — a bound on the search, not the filter.
 * Firestore's geohash lookup needs *some* range, and by default the list is
 * cut by count rather than by distance, so this only has to be wide enough
 * that the twenty closest are all inside it. The distance filter in the panel
 * narrows what comes back; it never reaches past this.
 */
const SEARCH_RADIUS_KM = 50;

const DEFAULTS: FilterState = {
  // No distance limit unless someone opens the panel and sets one.
  radiusKm: null,
  category: 'all',
  status: 'active',
  search: '',
  // The list is always ordered by distance; this only falls back to name when
  // the browser cannot give us a position at all.
  sort: 'distance',
};

/** How many the list shows before it asks to be opened up. */
const NEAREST = 20;

/**
 * How many filters are narrowing the results.
 *
 * The panel is closed by default, so an active filter would otherwise be
 * invisible — someone would see a short list and no reason for it. Sort is
 * excluded: it reorders, it never hides.
 */
function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.radiusKm !== null) n += 1;
  if (f.search.trim() !== '') n += 1;
  if (f.category !== DEFAULTS.category) n += 1;
  if (f.status !== DEFAULTS.status) n += 1;
  return n;
}

export function CustomerHome() {
  const { coords, status: locationStatus, request } = useGeolocation();
  const [filters, setFilters] = useState<FilterState>(DEFAULTS);
  const [queues, setQueues] = useState<DiscoveredQueue[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
    findQueuesNear(coords, SEARCH_RADIUS_KM)
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
  }, [coords]);

  // Distance sorting is meaningless without a location; fall back to name so
  // the list still has a sensible order.
  // The list is always in distance order. Name is the fallback for when the
  // browser has actually refused or cannot answer — without a position there
  // is no distance to order by, and an arbitrary order would be worse.
  useEffect(() => {
    if (noLocationPossible && filters.sort === 'distance') {
      setFilters((f) => ({ ...f, sort: 'name' }));
    }
  }, [noLocationPossible, filters.sort]);

  const visible = useMemo(
    () => (queues ? applyFilters(queues, filters) : []),
    [queues, filters],
  );

  /** The closest twenty. `visible` is already in distance order. */
  const shown = useMemo(
    () => (showAll ? visible : visible.slice(0, NEAREST)),
    [visible, showAll],
  );

  const beyond = visible.length - shown.length;
  const activeFilters = activeFilterCount(filters);

  return (
    <main className="screen">
      <div className="eyebrow-row">
        <p className="eyebrow">[ CUSTOMER MODE ]</p>
        <span className="screen-count">
          {queues ? `${shown.length} nearby` : '—'}
        </span>
      </div>

      <div className="screen-intro">
        <h1>
          <span className="light">Find a queue.</span>
          <br />
          Skip the wait.
        </h1>
        <p className="screen-lede">
          See how long the line is before you go. Join from anywhere — no
          login, no standing around.
        </p>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className="secondary filter-toggle"
          aria-expanded={showFilters}
          aria-controls="filters"
          onClick={() => setShowFilters((open) => !open)}
        >
          Search and filter
          {activeFilters > 0 && (
            <span className="filter-count" aria-hidden="true">
              {activeFilters}
            </span>
          )}
        </button>
        {activeFilters > 0 && (
          <button
            type="button"
            className="link"
            onClick={() => setFilters(DEFAULTS)}
          >
            Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <Filters
        id="filters"
        hidden={!showFilters}
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
            ? 'No queues near you yet.'
            : 'No queues match these filters.'}
        </p>
      )}

      <ul className="queue-cards">
        {shown.map((q) => (
          <QueueCard key={`${q.shopId}/${q.id}`} queue={q} showDistance={hasLocation} />
        ))}
      </ul>

      {/* A cap with no way past it is a dead end, so the rest stay one tap
          away rather than being unreachable. */}
      {beyond > 0 && (
        <p className="list-note">
          Showing the {NEAREST} closest.{' '}
          <button type="button" className="link" onClick={() => setShowAll(true)}>
            Show all {visible.length}
          </button>
        </p>
      )}
      {showAll && visible.length > NEAREST && (
        <p className="list-note">
          Showing all {visible.length}.{' '}
          <button type="button" className="link" onClick={() => setShowAll(false)}>
            Show the {NEAREST} closest
          </button>
        </p>
      )}
    </main>
  );
}
