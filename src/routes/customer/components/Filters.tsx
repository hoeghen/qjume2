import { QUEUE_CATEGORIES, type QueueCategory } from '../../../types/index.js';
import type { Filters as FilterState, SortKey } from '../../../lib/discovery.js';

export const CATEGORY_LABELS: Record<QueueCategory, string> = {
  'food-and-drink': 'Food and drink',
  'health-and-medical': 'Health and medical',
  'government-and-public-services': 'Government and public services',
  'banking-and-finance': 'Banking and finance',
  'retail-and-shopping': 'Retail and shopping',
  'personal-care': 'Personal care',
  automotive: 'Automotive',
  education: 'Education',
  'transport-and-travel': 'Transport and travel',
  'events-and-attractions': 'Events and attractions',
  other: 'Other',
};

const RADII = [1, 2, 5, 10, 25, 50];

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /**
   * False only once the browser has actually refused or cannot answer — not
   * while a position is still being fetched.
   */
  canUseDistance: boolean;
}

export function Filters({ value, onChange, canUseDistance }: Props) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="filters">
      <label className="sr-only" htmlFor="search">
        Search
      </label>
      <input
        id="search"
        type="search"
        placeholder="Search by name, address or service"
        value={value.search}
        onChange={(e) => set('search', e.target.value)}
      />

      <div className="filter-row">
        <label>
          <span>Within</span>
          <select
            value={value.radiusKm}
            disabled={!canUseDistance}
            onChange={(e) => set('radiusKm', Number(e.target.value))}
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Category</span>
          <select
            value={value.category}
            onChange={(e) =>
              set('category', e.target.value as FilterState['category'])
            }
          >
            <option value="all">All</option>
            {QUEUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select
            value={value.status}
            onChange={(e) =>
              set('status', e.target.value as FilterState['status'])
            }
          >
            <option value="active">Open now</option>
            <option value="inactive">Closed</option>
            <option value="all">Any</option>
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select
            value={value.sort}
            onChange={(e) => set('sort', e.target.value as SortKey)}
          >
            {canUseDistance && <option value="distance">Distance</option>}
            <option value="name">Name</option>
            <option value="wait">Wait time</option>
          </select>
        </label>
      </div>
    </div>
  );
}
