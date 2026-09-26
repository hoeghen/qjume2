import { useCollection } from '../../lib/hooks/useFirestore.js';
import { auditLogEntries } from '../../lib/firestore/queries.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

/**
 * Every admin action, most recent first. Nothing here is editable — it is a
 * record of what was done, not a screen that does anything itself. See
 * CLAUDE.md decision 9.
 */
export function AdminAuditLog() {
  const { t } = useT();
  const { data: entries, loading } = useCollection(
    auditLogEntries(),
    'admin/log',
  );

  return (
    <main className="panel">
      <p>
        <LocalizedLink className="link" to="/admin">
          {t('admin.shopDetail.allShops')}
        </LocalizedLink>
      </p>
      <h1>{t('admin.auditLog.title')}</h1>

      {loading && <p>{t('common.loading')}</p>}
      {!loading && entries?.length === 0 && (
        <p className="muted">{t('admin.auditLog.nothingLogged')}</p>
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
                  {t('admin.auditLog.changed', { fields: Object.keys(entry.changes).join(', ') })}
                </p>
              )}
            </div>
            <LocalizedLink className="link" to={`/admin/shops/${entry.shopId}`}>
              {t('admin.auditLog.shop')}
            </LocalizedLink>
          </li>
        ))}
      </ul>
    </main>
  );
}
