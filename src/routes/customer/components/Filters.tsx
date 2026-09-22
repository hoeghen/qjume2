import { QUEUE_CATEGORIES } from '../../../types/index.js';
import type { Filters as FilterState } from '../../../lib/discovery.js';
import { CATEGORY_LABELS } from '../../../lib/categories.js';

/**
 * A single building (50 m) to a short drive (50 km), ten steps on the 1-2-5
 * scale a ruler or a map uses — each step roughly doubles to two-and-a-half
 * times the last, so the same ten numbers read fine whether someone is
 * narrowing to their street or to their whole town. Round numbers, so the
 * label is hand-written rather than run through `formatDistance` — that
 * rounds to "1.0 km" where a fixed option list should just say "1 km".
 */
const RADII: [km: number, label: string][] = [
  [0.05, '50 m'],
  [0.1, '100 m'],
  [0.25, '250 m'],
  [0.5, '500 m'],
  [1, '1 km'],
  [2, '2 km'],
  [5, '5 km'],
  [10, '10 km'],
  [25, '25 km'],
  [50, '50 km'],
];

interface Props {
  /** Ties the panel to the button that discloses it. */
  id: string;
  hidden: boolean;
  value: FilterState;
  onChange: (next: FilterState) => void;
  /**
   * False only once the browser has actually refused or cannot answer — not
   * while a position is still being fetched. Without one there is no distance
   * to measure against, so the limit has nothing to do.
   */
  canUseDistance: boolean;
}

export function Filters({
  id,
  hidden,
  value,
  onChange,
  canUseDistance,
}: Props) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  // Rendered even when closed, and hidden with the attribute rather than
  // unmounted: the button's aria-controls has to point at something that
  // exists, and `hidden` takes the fields out of the tab order for us.
  return (
    <div className="filters" id={id} hidden={hidden}>
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
            value={value.radiusKm ?? ''}
            disabled={!canUseDistance}
            onChange={(e) =>
              set('radiusKm', e.target.value === '' ? null : Number(e.target.value))
            }
          >
            {/* The default. Not a distance, so it carries no number. */}
            <option value="">Any distance</option>
            {RADII.map(([r, label]) => (
              <option key={r} value={r}>
                {label}
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
      </div>
    </div>
  );
}
