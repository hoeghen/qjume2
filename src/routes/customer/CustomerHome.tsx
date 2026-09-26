import { useEffect, useMemo, useState } from 'react';
import {
  applyFilters,
  findNearest,
  type DiscoveredQueue,
  type Filters as FilterState,
} from '../../lib/discovery.js';
import { useGeolocation } from '../../lib/hooks/useGeolocation.js';
import { messageOf } from '../../lib/functions.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { Filters } from './components/Filters.js';
import { QueueCard } from './components/QueueCard.js';

const DEFAULTS: FilterState = {
  // No distance limit unless someone opens the panel and sets one.
  radiusKm: null,
  category: 'all',
  // Open queues only. Someone on this screen is looking for somewhere to join
  // now; a shut counter is not an answer to that. The status control in the
  // panel brings the rest back.
  status: 'active',
  search: '',
  // The list is always ordered by distance; this only falls back to name when
  // the browser cannot give us a position at all.
  sort: 'distance',
};

/** How many the list shows before it asks to be opened up. */
const NEAREST = 20;

/**
 * How many are fetched to filter over.
 *
 * Larger than what is shown, because the filters have to be able to find
 * something: searching for a barber among only the twenty closest would come
 * back empty while the twenty-first is a barber. A count is a safe bound in a
 * way a distance is not — it can never produce an empty list when queues
 * exist, it only decides how deep the filters can reach.
 */
const WORKING_SET = 100;

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
  const { t, tn } = useT();
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
    findNearest(coords, WORKING_SET)
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
        <p className="eyebrow">{t('discovery.eyebrow')}</p>
        <span className="screen-count">
          {queues ? t('discovery.nearby', { count: shown.length }) : t('discovery.noCount')}
        </span>
      </div>

      <div className="screen-intro">
        <h1>
          <span className="light">{t('discovery.titleLight')}</span>
          <br />
          {t('discovery.titleRest')}
        </h1>
        <p className="screen-lede">{t('discovery.lede')}</p>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className="secondary filter-toggle"
          aria-expanded={showFilters}
          aria-controls="filters"
          onClick={() => setShowFilters((open) => !open)}
        >
          {t('discovery.searchAndFilter')}
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
            {tn(activeFilters, 'discovery.clearFilters')}
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
          {t('discovery.locationDenied')}{' '}
          <button type="button" className="link" onClick={request}>
            {t('discovery.tryAgain')}
          </button>
        </p>
      )}
      {locationStatus === 'unavailable' && (
        <p className="notice">{t('discovery.locationUnavailable')}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {locationStatus === 'locating' && !queues && <p>{t('discovery.finding')}</p>}
      {loading && queues && <p className="muted">{t('discovery.updating')}</p>}

      {queues && visible.length === 0 && !loading && (
        <p className="muted">
          {queues.length === 0
            ? t('discovery.noQueuesAnywhere')
            : t('discovery.noQueuesMatch')}
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
          {t('discovery.showingClosest', { n: NEAREST })}{' '}
          <button type="button" className="link" onClick={() => setShowAll(true)}>
            {t('discovery.showAll', { n: visible.length })}
          </button>
        </p>
      )}
      {showAll && visible.length > NEAREST && (
        <p className="list-note">
          {t('discovery.showingAll', { n: visible.length })}{' '}
          <button type="button" className="link" onClick={() => setShowAll(false)}>
            {t('discovery.showFewer', { n: NEAREST })}
          </button>
        </p>
      )}
    </main>
  );
}
