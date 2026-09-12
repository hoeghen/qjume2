import { useEffect, useState } from 'react';
import { useCollection } from '../../../lib/hooks/useFirestore.js';
import { stationsOf } from '../../../lib/firestore/queries.js';
import { claimStation, messageOf } from '../../../lib/functions.js';

interface Props {
  shopId: string;
  queueId: string;
  stationId: string | null;
  onPick: (stationId: string, label: string) => void;
}

/**
 * Staff pick a serving identity at the start of a shift, so a called customer
 * is told where to go ("Marta, Till 2").
 */
export function StationPicker({ shopId, queueId, stationId, onPick }: Props) {
  const { data: stations } = useCollection(
    stationsOf(shopId, queueId),
    `${shopId}/${queueId}/stations`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // With exactly one station already open, take it rather than making staff
  // choose from a list of one.
  useEffect(() => {
    if (stationId || !stations || stations.length !== 1) return;
    const only = stations[0];
    if (only) onPick(only.id, only.label);
  }, [stationId, stations, onPick]);

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

  return (
    <main className="panel">
      <h1>Which position are you serving from?</h1>

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
          Open another position
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
