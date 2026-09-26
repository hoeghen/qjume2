import { useState } from 'react';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { allShops } from '../../lib/firestore/queries.js';
import { signOut } from '../../lib/auth.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import {
  ADMIN_FILTER_DEFAULTS,
  AdminFilters,
  activeAdminFilterCount,
  type AdminShopFilterState,
} from './components/AdminFilters.js';

/**
 * Every shop on the platform, alphabetical, with the same search-and-filter
 * pattern as the customer discovery list: a toggle button hidden behind a
 * count badge, rather than search and selects sitting in the page by
 * default.
 *
 * No pagination: the count that would make a flat list unusable is a good
 * problem to have, and not one this needs to anticipate before it exists.
 */
export function AdminShopList() {
  const { t, tn } = useT();
  const { data: shops, loading } = useCollection(allShops(), 'admin/shops');
  const [filters, setFilters] = useState<AdminShopFilterState>(
    ADMIN_FILTER_DEFAULTS,
  );
  const [showFilters, setShowFilters] = useState(false);

  const needle = filters.search.trim().toLowerCase();
  const filtered = shops?.filter((s) => {
    if (needle && !s.name.toLowerCase().includes(needle)) return false;
    if (filters.plan !== 'all' && s.plan !== filters.plan) return false;
    if (filters.status === 'active' && s.suspended) return false;
    if (filters.status === 'suspended' && !s.suspended) return false;
    return true;
  });

  const activeFilters = activeAdminFilterCount(filters);

  return (
    <main className="panel">
      <header className="serving-header">
        <h1>{t('admin.shopList.title')}</h1>
        <span className="row tight">
          <LocalizedLink className="link" to="/admin/log">
            {t('admin.shopList.auditLog')}
          </LocalizedLink>
          <button type="button" className="link" onClick={() => void signOut()}>
            {t('admin.shopList.signOut')}
          </button>
        </span>
      </header>

      <div className="filter-bar">
        <button
          type="button"
          className="secondary filter-toggle"
          aria-expanded={showFilters}
          aria-controls="shop-filters"
          onClick={() => setShowFilters((open) => !open)}
        >
          {t('admin.shopList.searchAndFilter')}
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
            onClick={() => setFilters(ADMIN_FILTER_DEFAULTS)}
          >
            {tn(activeFilters, 'admin.shopList.clearFilters')}
          </button>
        )}
      </div>

      <AdminFilters
        id="shop-filters"
        hidden={!showFilters}
        value={filters}
        onChange={setFilters}
      />

      {loading && <p>{t('common.loading')}</p>}
      {!loading && filtered?.length === 0 && (
        <p className="muted">
          {shops?.length ? t('admin.shopList.noMatch') : t('admin.shopList.noShops')}
        </p>
      )}

      <ul className="queue-list">
        {filtered?.map((s) => (
          <li key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <span className={`badge${s.plan === 'paid' ? ' status-drainMode' : ''}`}>
                {t(`admin.planLabel.${s.plan}`)}
              </span>
              {s.suspended && (
                <span className="badge status-closed">{t('admin.shopList.suspended')}</span>
              )}
              <p className="muted">{t('admin.shopList.owner', { uid: s.ownerUid })}</p>
            </div>
            <span className="row tight">
              <LocalizedLink className="button" to={`/admin/shops/${s.id}`}>
                {t('admin.shopList.manage')}
              </LocalizedLink>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
