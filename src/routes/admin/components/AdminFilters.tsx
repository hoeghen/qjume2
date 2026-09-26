import { useT } from '../../../lib/i18n/LanguageContext.js';

export interface AdminShopFilterState {
  search: string;
  plan: 'all' | 'free' | 'paid';
  status: 'all' | 'active' | 'suspended';
}

export const ADMIN_FILTER_DEFAULTS: AdminShopFilterState = {
  search: '',
  plan: 'all',
  // Unlike the customer list, "all" is the default here on purpose: an admin
  // narrowing the search is opting in, but browsing everything — including
  // what's suspended — is the ordinary case for this screen, not the
  // exception it is for someone looking for somewhere to join now.
  status: 'all',
};

/** How many filters are narrowing the list. Mirrors the customer list's. */
export function activeAdminFilterCount(f: AdminShopFilterState): number {
  let n = 0;
  if (f.search.trim() !== '') n += 1;
  if (f.plan !== ADMIN_FILTER_DEFAULTS.plan) n += 1;
  if (f.status !== ADMIN_FILTER_DEFAULTS.status) n += 1;
  return n;
}

interface Props {
  /** Ties the panel to the button that discloses it. */
  id: string;
  hidden: boolean;
  value: AdminShopFilterState;
  onChange: (next: AdminShopFilterState) => void;
}

/**
 * The admin shop list's search-and-filter panel — same shape as the
 * customer discovery `Filters`: hidden behind a toggle by default, a search
 * box plus a row of selects. `plan` and `status` (suspended) stand in for
 * that panel's category and status, since a shop carries neither a category
 * nor a distance to filter by.
 */
export function AdminFilters({ id, hidden, value, onChange }: Props) {
  const { t } = useT();
  const set = <K extends keyof AdminShopFilterState>(
    key: K,
    v: AdminShopFilterState[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="filters" id={id} hidden={hidden}>
      <label className="sr-only" htmlFor="shop-search">
        {t('admin.filters.searchLabel')}
      </label>
      <input
        id="shop-search"
        type="search"
        placeholder={t('admin.filters.searchPlaceholder')}
        value={value.search}
        onChange={(e) => set('search', e.target.value)}
      />

      <div className="filter-row">
        <label>
          <span>{t('admin.filters.plan')}</span>
          <select
            value={value.plan}
            onChange={(e) =>
              set('plan', e.target.value as AdminShopFilterState['plan'])
            }
          >
            <option value="all">{t('admin.filters.all')}</option>
            <option value="free">{t('admin.filters.free')}</option>
            <option value="paid">{t('admin.filters.paid')}</option>
          </select>
        </label>

        <label>
          <span>{t('admin.filters.status')}</span>
          <select
            value={value.status}
            onChange={(e) =>
              set('status', e.target.value as AdminShopFilterState['status'])
            }
          >
            <option value="all">{t('admin.filters.all')}</option>
            <option value="active">{t('admin.filters.active')}</option>
            <option value="suspended">{t('admin.filters.suspended')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
