import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { allShops } from '../../lib/firestore/queries.js';
import { signOut } from '../../lib/auth.js';

/**
 * Every shop on the platform, alphabetical, with a search box over the name.
 *
 * No pagination: the count that would make a flat list unusable is a good
 * problem to have, and not one this needs to anticipate before it exists.
 */
export function AdminShopList() {
  const { data: shops, loading } = useCollection(allShops(), 'admin/shops');
  const [search, setSearch] = useState('');

  const needle = search.trim().toLowerCase();
  const filtered = shops?.filter((s) => s.name.toLowerCase().includes(needle));

  return (
    <main className="panel">
      <header className="serving-header">
        <h1>Shops</h1>
        <span className="row tight">
          <Link className="link" to="/admin/log">
            Audit log
          </Link>
          <button type="button" className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </span>
      </header>

      <label className="sr-only" htmlFor="shop-search">
        Search shops by name
      </label>
      <input
        id="shop-search"
        type="search"
        placeholder="Search by name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p>Loading…</p>}
      {!loading && filtered?.length === 0 && (
        <p className="muted">
          {shops?.length ? 'No shop matches that.' : 'No shops yet.'}
        </p>
      )}

      <ul className="queue-list">
        {filtered?.map((s) => (
          <li key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <span className={`badge${s.plan === 'paid' ? ' status-drainMode' : ''}`}>
                {s.plan}
              </span>
              {s.suspended && <span className="badge status-closed">Suspended</span>}
              <p className="muted">Owner: {s.ownerUid}</p>
            </div>
            <span className="row tight">
              <Link className="button" to={`/admin/shops/${s.id}`}>
                Manage
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
