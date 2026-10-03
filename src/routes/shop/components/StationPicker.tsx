import { useEffect, useState } from 'react';
import { useCollection } from '../../../lib/hooks/useFirestore.js';
import { stationsOf } from '../../../lib/firestore/queries.js';
import { claimStation, deleteStation, messageOf } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';
import { tillLabel } from '../../../lib/tills.js';

interface Props {
  shopId: string;
  queueId: string;
  stationId: string | null;
  /** Take the only open station without asking. Off after "Change station". */
  autoPick?: boolean;
  onPick: (stationId: string, label: string) => void;
}

/**
 * Staff pick a serving identity at the start of a shift, so a called customer
 * is told where to go ("Marta, Till 2").
 *
 * With exactly one station already open it is taken without asking — a
 * question with only one possible answer is not worth a tap.
 */
export function StationPicker({
  shopId,
  queueId,
  stationId,
  autoPick = true,
  onPick,
}: Props) {
  const { t, locale } = useT();
  const { data: stations } = useCollection(
    stationsOf(shopId, queueId),
    `${shopId}/${queueId}/stations`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Exactly one already open: take it rather than making staff choose from a
  // list of one. `busy` guards against re-firing while a claim is in flight.
  useEffect(() => {
    if (!autoPick || stationId || !stations || busy) return;
    if (stations.length === 1) {
      const only = stations[0];
      if (only) onPick(only.id, only.label);
    }
  }, [autoPick, stationId, stations, busy, onPick]);

  if (stationId) return null;

  async function claim(existingId?: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await claimStation({
        shopId,
        queueId,
        ...(existingId ? { stationId: existingId } : {}),
      });
      onPick(result.stationId, result.label);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteStation({ shopId, queueId, stationId: id });
      setConfirmDelete(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel">
      <h1>{t('shop.stationPicker.title')}</h1>

      <div className="stack">
        {stations?.map((s) => {
          const name = tillLabel(s.label, locale);
          // Only a till nobody is using can go; the server checks it again.
          const deletable = !s.serving && !s.currentTicketId;
          if (confirmDelete === s.id) {
            return (
              <div key={s.id} className="till-row till-confirm" role="group">
                <span>{t('shop.stationPicker.confirmDelete', { name })}</span>
                <button type="button" className="danger" disabled={busy} onClick={() => void remove(s.id)}>
                  {t('shop.stationPicker.delete')}
                </button>
                <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmDelete(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            );
          }
          return (
            <div key={s.id} className="till-row">
              <button type="button" disabled={busy} onClick={() => void claim(s.id)}>
                {name}
              </button>
              {deletable && (
                <button
                  type="button"
                  className="link"
                  disabled={busy}
                  aria-label={t('shop.stationPicker.deleteNamed', { name })}
                  onClick={() => setConfirmDelete(s.id)}
                >
                  {t('shop.stationPicker.delete')}
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void claim()}
        >
          {stations?.length
            ? t('shop.stationPicker.openAnother')
            : t('shop.stationPicker.openFirst')}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
