/** Completions the rolling average is drawn from. See PRD 9.5. */
export const SERVICE_TIME_WINDOW = 10;

/**
 * A sample outside this range is not a service time.
 *
 * Too short and it is a mis-tap; too long and the counter went to lunch with
 * someone still called. Either would drag the average somewhere useless, and
 * the estimate is the number customers decide on before setting off.
 */
export const MIN_SAMPLE_SECONDS = 5;
export const MAX_SAMPLE_SECONDS = 60 * 45;

export function isUsableSample(seconds: number): boolean {
  return (
    Number.isFinite(seconds) &&
    seconds >= MIN_SAMPLE_SECONDS &&
    seconds <= MAX_SAMPLE_SECONDS
  );
}

export interface ServiceTimeAverage {
  averageSeconds: number;
  sampleCount: number;
}

/**
 * Fold one completion into the rolling average.
 *
 * Weighted by 1/n while fewer than `SERVICE_TIME_WINDOW` samples exist, so the
 * first few completions move it quickly, then fixed at 1/window, which tracks
 * recent completions and lets an old pace fade rather than anchoring forever.
 */
export function foldSample(
  previous: ServiceTimeAverage,
  sampleSeconds: number,
): ServiceTimeAverage {
  const sampleCount = previous.sampleCount + 1;
  const weight = 1 / Math.min(sampleCount, SERVICE_TIME_WINDOW);
  const averageSeconds =
    previous.averageSeconds + weight * (sampleSeconds - previous.averageSeconds);
  return { averageSeconds: Math.round(averageSeconds), sampleCount };
}
