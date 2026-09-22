import { Link } from 'react-router-dom';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { auditLogEntries } from '../../lib/firestore/queries.js';

/**
 * Every admin action, most recent first. Nothing here is editable — it is a
 * record of what was done, not a screen that does anything itself. See
 * CLAUDE.md decision 9.
 */
export function AdminAuditLog() {
  const { data: entries, loading } = useCollection(
    auditLogEntries(),
    'admin/log',
  );

  return (
    <main className="panel">
      <p>
        <Link className="link" to="/admin">
          ← All shops
        </Link>
      </p>
      <h1>Admin activity</h1>

      {loading && <p>Loading…</p>}
      {!loading && entries?.length === 0 && (
        <p className="muted">Nothing logged yet.</p>
      )}

      <ul className="queue-list">
        {entries?.map((entry) => (
          <li key={entry.id}>
            <div>
              <strong>{entry.summary}</strong>
              <p className="muted">
                {new Date(entry.at).toLocaleString()} ·{' '}
                {entry.adminEmail ?? entry.adminUid}
              </p>
              {entry.changes && (
                <p className="muted">
                  Changed: {Object.keys(entry.changes).join(', ')}
                </p>
              )}
            </div>
            <Link className="link" to={`/admin/shops/${entry.shopId}`}>
              Shop
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
