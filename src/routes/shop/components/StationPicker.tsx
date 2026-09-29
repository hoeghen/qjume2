import { useEffect, useState } from 'react';
import { useCollection } from '../../../lib/hooks/useFirestore.js';
import { stationsOf } from '../../../lib/firestore/queries.js';
import { claimStation, messageOf } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  shopId: string;
  queueId: string;
  stationId: string | null;
  /** The free plan's one-station cap (see FREE_TIER_LIMITS.maxStations). */
  paid: boolean;
  onPick: (stationId: string, label: string) => void;
}

/**
 * Staff pick a serving identity at the start of a shift, so a called customer
 * is told where to go ("Marta, Till 2").
 *
 * Only shown at all when there could be more than one — a free-plan shop
 * never has a second station to choose between or come back to, so this
 * claims its one station silently instead of asking a question with only
 * one possible answer.
 */
export function StationPicker({ shopId, queueId, stationId, paid, onPick }: Props) {
  const { t } = useT();
  const { data: stations } = useCollection(
    stationsOf(shopId, queueId),
    `${shopId}/${queueId}/stations`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free plan: claim the shop's one station (existing or new) without ever
  // asking. Paid, with exactly one already open: take it rather than making
  // staff choose from a list of one. Either way, `busy` guards against
  // re-firing while the claim is in flight.
  useEffect(() => {
    if (stationId || !stations || busy) return;
    if (!paid) {
      const only = stations[0];
      if (only) onPick(only.id, only.label);
      else void claim();
      return;
    }
    if (stations.length === 1) {
      const only = stations[0];
      if (only) onPick(only.id, only.label);
    }
  }, [stationId, stations, busy, paid, onPick]);

  if (stationId || !paid) return null;

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

  return (
    <main className="panel">
      <h1>{t('shop.stationPicker.title')}</h1>

      <div className="stack">
        {stations?.map((s) => (
          <button key={s.id} type="button" disabled={busy} onClick={() => void claim(s.id)}>
            {s.label}
          </button>
        ))}
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
