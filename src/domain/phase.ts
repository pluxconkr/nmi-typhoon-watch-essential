/**
 * Phase derivation: none | before | during | after.
 * Deterministic — from stored NWS alerts and the device clock only. No AI, no server time.
 */
import { isActive, isTyphoonClass, isWarning, isWatch, parseVtec, vtecIsEnded } from './nws';
import { toEpoch } from './time';
import type { Phase, StoredAlert, WindForecast } from './types';

/** How long after a warning ends we keep showing the "after" screen. */
export const AFTER_WINDOW_HOURS = 72;

/** NWS damaging-wind criterion (mph) used for the forecast-based onset fallback. */
export const DAMAGING_GUST_MPH = 58;

export interface PhaseState {
  phase: Phase;
  /** The alert driving the phase, if any. */
  primary: StoredAlert | null;
  /** Countdown target (epoch ms) for 'before'. */
  target: number | null;
  /** Where the target came from. */
  targetSource: 'nws-onset' | 'nws-effective' | 'open-meteo' | 'vtec' | null;
  /** For 'after': when the warning ended (epoch ms). */
  endedAt: number | null;
}

const NONE: PhaseState = { phase: 'none', primary: null, target: null, targetSource: null, endedAt: null };

function endOf(a: StoredAlert): number {
  const v = parseVtec(a.vtec);
  const vEnd = v?.end ? toEpoch(v.end) : NaN;
  const e = toEpoch(a.ends ?? a.expires);
  if (Number.isFinite(e)) return e;
  return Number.isFinite(vEnd) ? vEnd : NaN;
}

function onsetOf(a: StoredAlert): { at: number; source: PhaseState['targetSource'] } | null {
  const onset = toEpoch(a.onset);
  if (Number.isFinite(onset)) return { at: onset, source: 'nws-onset' };
  const v = parseVtec(a.vtec);
  const vb = v?.begin ? toEpoch(v.begin) : NaN;
  if (Number.isFinite(vb)) return { at: vb, source: 'vtec' };
  const eff = toEpoch(a.effective);
  if (Number.isFinite(eff)) return { at: eff, source: 'nws-effective' };
  return null;
}

/** First future hour whose max gust ≥ threshold. Gust is the max of the PRECEDING hour, so onset = t − 1h. */
export function estimateOnsetFromForecast(
  f: WindForecast | null | undefined,
  now: number,
  thresholdMph = DAMAGING_GUST_MPH,
  maxAgeMs = 24 * 3600_000,
): number | null {
  if (!f || f.hourly.length === 0) return null;
  if (now - f.fetchedAt > maxAgeMs) return null;
  const HOUR = 3600_000;
  for (const h of f.hourly) {
    if (h.t <= now - HOUR) continue;
    if (h.gust != null && h.gust >= thresholdMph) return h.t - HOUR;
  }
  return null;
}

const rank = (a: StoredAlert) => (isWarning(a.event) ? 2 : isWatch(a.event) ? 1 : 0);

/**
 * Derive the phase.
 *
 *  before  — an active typhoon-class WARNING/WATCH whose onset is still ahead
 *  during  — an active typhoon-class WARNING whose onset has passed and end is ahead
 *  after   — the newest typhoon-class WARNING ended (or was cancelled) within the last 72 h
 *  none    — otherwise
 */
export function derivePhase(alerts: StoredAlert[], now: number = Date.now(), forecast?: WindForecast | null): PhaseState {
  const typhoon = alerts.filter((a) => isTyphoonClass(a.event));
  if (typhoon.length === 0) return NONE;

  const active = typhoon.filter((a) => isActive(a, now)).sort((a, b) => rank(b) - rank(a) || toEpoch(b.sent) - toEpoch(a.sent));

  if (active.length > 0) {
    const primary = active[0];
    const onset = onsetOf(primary);
    const isWarn = isWarning(primary.event);
    if (isWarn) {
      if (onset && onset.at > now) {
        return { phase: 'before', primary, target: onset.at, targetSource: onset.source, endedAt: null };
      }
      if (onset && onset.at <= now) {
        return { phase: 'during', primary, target: null, targetSource: null, endedAt: null };
      }
      // Warning with no usable onset: treat as imminent unless the forecast says otherwise.
      const est = estimateOnsetFromForecast(forecast, now);
      if (est && est > now) return { phase: 'before', primary, target: est, targetSource: 'open-meteo', endedAt: null };
      return { phase: 'during', primary, target: null, targetSource: null, endedAt: null };
    }
    // Watch only: prepare. Target = onset if known, else forecast estimate, else end of watch.
    if (onset && onset.at > now) return { phase: 'before', primary, target: onset.at, targetSource: onset.source, endedAt: null };
    const est = estimateOnsetFromForecast(forecast, now);
    if (est && est > now) return { phase: 'before', primary, target: est, targetSource: 'open-meteo', endedAt: null };
    const end = endOf(primary);
    return { phase: 'before', primary, target: Number.isFinite(end) && end > now ? end : null, targetSource: Number.isFinite(end) ? 'nws-effective' : null, endedAt: null };
  }

  // No active typhoon-class alert: recently ended warning → after.
  const endedWarnings = typhoon
    .filter((a) => isWarning(a.event))
    .map((a) => ({ a, end: vtecIsEnded(a.vtec) ? toEpoch(a.receivedAt) : endOf(a) }))
    .filter((x) => Number.isFinite(x.end) && x.end <= now)
    .sort((x, y) => y.end - x.end);
  if (endedWarnings.length > 0) {
    const { a, end } = endedWarnings[0];
    if (now - end <= AFTER_WINDOW_HOURS * 3600_000) {
      return { phase: 'after', primary: a, target: null, targetSource: null, endedAt: end };
    }
  }
  return NONE;
}
