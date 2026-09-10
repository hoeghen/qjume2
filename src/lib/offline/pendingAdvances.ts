/**
 * Advances made while the till had no network.
 *
 * A Cloud Function cannot be called offline, and ticket state is server-only
 * (CLAUDE.md invariant 1), so the device cannot simply write the transition
 * itself. Instead it records what the staff member did — served, or not here —
 * and replays those decisions through `callNext` when the connection returns.
 *
 * The consequence is honest and matches the PRD's known gap: while the shop is
 * offline, customers see a position that has stopped moving. The customer view
 * says so rather than showing a confidently wrong number.
 */
export interface PendingAdvance {
  shopId: string;
  queueId: string;
  stationId: string;
  outcome: 'served' | 'noShow';
  /** When the staff member actually tapped, not when it was replayed. */
  at: number;
}

const KEY = 'qjume:pending-advances';

function read(): PendingAdvance[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingAdvance[]) : [];
  } catch {
    return [];
  }
}

function write(list: PendingAdvance[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage refused. The advance is lost on reload, which is worse than
    // keeping it — but not as bad as blocking the till mid-shift.
  }
}

export function recordAdvance(advance: PendingAdvance): void {
  write([...read(), advance]);
}

export function pendingFor(shopId: string, queueId: string): PendingAdvance[] {
  return read().filter((a) => a.shopId === shopId && a.queueId === queueId);
}

export function pendingCount(): number {
  return read().length;
}

/**
 * Replay everything recorded, oldest first, stopping at the first failure.
 *
 * Order matters: these are queue advances, and replaying them out of sequence
 * would serve people in the wrong order. Stopping on failure keeps the rest
 * queued rather than skipping one and corrupting the sequence.
 */
export async function replayAdvances(
  send: (advance: PendingAdvance) => Promise<unknown>,
): Promise<{ replayed: number; remaining: number }> {
  const queued = read().sort((a, b) => a.at - b.at);
  let replayed = 0;

  for (const advance of queued) {
    try {
      await send(advance);
      replayed += 1;
    } catch {
      break;
    }
  }

  const remaining = queued.slice(replayed);
  write(remaining);
  return { replayed, remaining: remaining.length };
}

export function clearAdvances(): void {
  write([]);
}
