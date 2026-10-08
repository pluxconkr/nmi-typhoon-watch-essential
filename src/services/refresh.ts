/**
 * Cache-first refresh orchestration. Never throws, never blocks rendering, never runs offline.
 * The UI is already drawn from local data before any of this starts.
 */
import { alertRepo, cacheMetaRepo, dropLowPriority, isLowOnSpace, reportStorageNotice, shelterRepo } from '@/data/repos';
import { mergeAlerts } from '@/domain/nws';
import { derivePhase } from '@/domain/phase';
import { checkDue, pollMinutes } from '@/domain/polling';
import { nowIso, toEpoch } from '@/domain/time';
import type { AssetKey, Shelter, StoredAlert } from '@/domain/types';
import { actions, getState, isOfflineNow } from '@/store/appStore';

import { fetchActiveAlerts } from './nwsClient';
import { notifyNewAlerts } from './notifications';
import { fetchForecast } from './openMeteoClient';
import { requestSummary } from './summaryClient';

export interface RefreshResult {
  alerts: 'ok' | 'skipped' | 'failed';
  /** 'low-storage' = deliberately not kept because the phone is almost full. */
  forecast: 'ok' | 'skipped' | 'failed' | 'low-storage';
  shelters: 'ok' | 'skipped' | 'failed' | 'no-source';
  newAlertIds: string[];
}

/** Optional remote shelter list (CNMI HSEM feed). Without it the bundled copy is the source. */
const SHELTERS_URL = process.env.EXPO_PUBLIC_SHELTERS_URL;

function stamp(key: AssetKey, bytes: number, version: string) {
  const meta = cacheMetaRepo.set({ key, fetchedAt: nowIso(), source: 'network', bytes, version });
  actions.setCacheMeta(meta);
}

export async function refreshAlerts(): Promise<{ status: RefreshResult['alerts']; newIds: string[] }> {
  if (isOfflineNow()) return { status: 'skipped', newIds: [] };
  try {
    const features = await fetchActiveAlerts();
    const existing = getState().alerts.filter((a) => !a.isDemo);
    const { alerts, newIds } = mergeAlerts(existing, features);
    actions.setAlerts(alerts);
    stamp('alerts', JSON.stringify(alerts).length, 'nws-active');
    if (newIds.length > 0) {
      const fresh = alerts.filter((a) => newIds.includes(a.alertId));
      await notifyNewAlerts(fresh);
    }
    // Fill in summaries for alerts that still need one (server-side, one call each, cached forever).
    void summarizePending(alerts);
    return { status: 'ok', newIds };
  } catch {
    return { status: 'failed', newIds: [] };
  }
}

async function summarizePending(alerts: StoredAlert[]) {
  const pending = alerts.filter((a) => a.summaryStatus === 'pending' && !a.isDemo).slice(0, 5);
  for (const a of pending) {
    if (isOfflineNow()) return;
    const r = await requestSummary(a);
    if (r) actions.setAlertSummary(a.alertId, r.summary, 'ok');
    else actions.setAlertSummary(a.alertId, null, 'unavailable');
  }
}

/** Retry summaries that were unavailable (e.g. server not deployed at the time). */
export async function retrySummaries(): Promise<void> {
  if (isOfflineNow()) return;
  const list = getState().alerts.filter((a) => a.summaryStatus !== 'ok' && !a.isDemo).slice(0, 5);
  for (const a of list) {
    const r = await requestSummary(a);
    if (r) actions.setAlertSummary(a.alertId, r.summary, 'ok');
  }
}

export async function refreshForecast(): Promise<RefreshResult['forecast']> {
  if (isOfflineNow()) return 'skipped';
  // The forecast is the first thing given up when space runs out, so it is not downloaded either.
  if (isLowOnSpace()) return 'low-storage';
  try {
    const f = await fetchForecast();
    actions.setForecast(f);
    stamp('forecast', JSON.stringify(f).length, 'open-meteo-v1');
    return 'ok';
  } catch {
    return 'failed';
  }
}

export async function refreshShelters(): Promise<RefreshResult['shelters']> {
  if (!SHELTERS_URL) return 'no-source';
  if (isOfflineNow()) return 'skipped';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(SHELTERS_URL, { headers: { Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return 'failed';
    const body = (await res.json()) as { shelters?: Shelter[]; version?: string };
    if (!body.shelters || !Array.isArray(body.shelters) || body.shelters.length === 0) return 'failed';
    const bytes = shelterRepo.saveDownloaded({ shelters: body.shelters, version: body.version ?? 'remote' });
    actions.setShelters(body.shelters, 'network');
    stamp('shelters', bytes, body.version ?? 'remote');
    return 'ok';
  } catch {
    return 'failed';
  }
}

let inFlight: Promise<RefreshResult> | null = null;

/** Refresh everything that can be refreshed. Concurrent calls share one run. */
export function refreshAll(): Promise<RefreshResult> {
  if (inFlight) return inFlight;
  actions.setRefreshing(true);
  inFlight = (async () => {
    // Almost full: give up re-downloadable data first and say so, instead of failing silently later.
    if (isLowOnSpace()) reportStorageNotice(dropLowPriority(), true);
    const total = SHELTERS_URL ? 3 : 2;
    let done = 0;
    actions.setRefreshProgress(0, total);
    const tick = <T,>(r: T): T => {
      done += 1;
      actions.setRefreshProgress(Math.min(done, total), total);
      return r;
    };
    const [a, f, s] = await Promise.all([refreshAlerts().then(tick), refreshForecast().then(tick), SHELTERS_URL ? refreshShelters().then(tick) : refreshShelters()]);
    actions.setRefreshing(false, Date.now());
    return { alerts: a.status, forecast: f, shelters: s, newAlertIds: a.newIds };
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Minutes between NWS checks right now: the Settings choice, or automatic (hourly; 10 min during a storm alert). */
export function currentPollMinutes(now: number = Date.now()): number {
  const s = getState();
  return pollMinutes(s.settings.pollInterval, derivePhase(s.alerts, now, s.forecast).phase);
}

/** Epoch ms of the last successful NWS check (persisted), or null. */
export function lastAlertCheckAt(): number | null {
  const at = getState().cacheMeta.alerts?.fetchedAt;
  const ms = at ? toEpoch(at) : NaN;
  return Number.isFinite(ms) ? ms : null;
}

/** After a failed or skipped attempt, wait this long before trying again. */
const RETRY_AFTER_MS = 2 * 60_000;

/** Check NWS when the polling interval has passed since the last successful check. */
export function refreshIfDue(now: number = Date.now()): Promise<RefreshResult | null> {
  if (isOfflineNow() || !checkDue(lastAlertCheckAt(), currentPollMinutes(now), now)) return Promise.resolve(null);
  const lastAttempt = getState().lastRefreshAt;
  if (lastAttempt && now - lastAttempt < RETRY_AFTER_MS) return Promise.resolve(null);
  return refreshAll();
}

/** Mark the retained alert ids as already notified (used by the demo loader). */
export function markNotified(ids: string[]) {
  alertRepo.markNotified(ids);
}
