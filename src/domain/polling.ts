/**
 * How often the app checks NWS for alerts. Automatic: hourly in calm weather, every 10 minutes from the
 * moment a storm alert is in the Before phase until it ends. The user can also pick a fixed rate.
 */
import type { Phase, PollInterval } from './types';

export const AUTO_CALM_MIN = 60;
export const AUTO_STORM_MIN = 10;
/** iOS and Android never run background work more often than this. */
export const BACKGROUND_MIN = 15;

export const POLL_CHOICES: PollInterval[] = ['auto', 5, 10, 15, 30, 60];

/** Minutes between checks for a setting in the current storm phase. */
export function pollMinutes(setting: PollInterval, phase: Phase): number {
  if (setting !== 'auto') return setting;
  return phase === 'before' || phase === 'during' ? AUTO_STORM_MIN : AUTO_CALM_MIN;
}

/** True when a check is due: never checked, or the last check is at least `minutes` old. */
export function checkDue(lastCheckAt: number | null, minutes: number, now: number = Date.now()): boolean {
  return lastCheckAt === null || now - lastCheckAt >= minutes * 60_000;
}

/** "Every 10 minutes", "Every hour". */
export function describeEvery(minutes: number): string {
  return minutes === 60 ? 'Every hour' : `Every ${minutes} minutes`;
}
