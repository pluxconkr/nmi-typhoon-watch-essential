/**
 * Cache-first refresh orchestration. Never throws, never blocks rendering, never runs offline.
 * The UI is already drawn from local data before any of this starts.
 */
import { alertRepo, cacheMetaRepo, shelterRepo } from '@/data/repos';
import { mergeAlerts } from '@/domain/nws';
import { nowIso } from '@/domain/time';
import type { AssetKey, Shelter, StoredAlert } from '@/domain/types';
import { actions, getState, isOfflineNow } from '@/store/appStore';

import { fetchActiveAlerts } from './nwsClient';
import { notifyNewAlerts } from './notifications';
import { fetchForecast } from './openMeteoClient';
import { requestSummary } from './summaryClient';

export interface RefreshResult {
  alerts: 'ok' | 'skipped' | 'failed';
  forecast: 'ok' | 'skipped' | 'failed';
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
    const [a, f, s] = await Promise.all([refreshAlerts(), refreshForecast(), refreshShelters()]);
    actions.setRefreshing(false, Date.now());
    return { alerts: a.status, forecast: f, shelters: s, newAlertIds: a.newIds };
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Foreground policy: refresh if the last attempt is older than `minAgeMs`. */
export function refreshIfStale(minAgeMs = 15 * 60_000): Promise<RefreshResult | null> {
  const last = getState().lastRefreshAt;
  if (last && Date.now() - last < minAgeMs) return Promise.resolve(null);
  return refreshAll();
}

/** Mark the retained alert ids as already notified (used by the demo loader). */
export function markNotified(ids: string[]) {
  alertRepo.markNotified(ids);
}
