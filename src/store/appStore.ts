/**
 * Zero-dependency app store built on useSyncExternalStore.
 *
 * Hydration is synchronous from local storage, so the first frame already shows
 * real data. Writes go to storage first, then notify subscribers. No network here.
 */
import { useSyncExternalStore } from 'react';

import {
  alertRepo,
  cacheMetaRepo,
  checklistRepo,
  forecastRepo,
  householdRepo,
  initStorage,
  locationRepo,
  onStorageNotice,
  settingsRepo,
  shelterRepo,
  storageNoticeRepo,
} from '@/data/repos';
import { RULES_VERSION } from '@/domain/rules';
import { nowIso } from '@/domain/time';
import type {
  CacheMetaMap,
  ChecklistStateMap,
  Household,
  LocationFix,
  Settings,
  Shelter,
  StorageNotice,
  StoredAlert,
  WindForecast,
} from '@/domain/types';

export interface NetworkInfo {
  /** true = online, false = offline, null = not determined yet. */
  online: boolean | null;
  type: string | null;
}

export interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  household: Household;
  checklist: ChecklistStateMap;
  taskChecks: Record<string, boolean>;
  alerts: StoredAlert[];
  shelters: Shelter[];
  shelterSource: 'bundle' | 'network';
  forecast: WindForecast | null;
  cacheMeta: CacheMetaMap;
  settings: Settings;
  network: NetworkInfo;
  location: LocationFix | null;
  locationStatus: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  /** Epoch ms of the last completed refresh attempt (any result). */
  lastRefreshAt: number | null;
  refreshing: boolean;
  /** Steps finished in the running refresh (Offline data screen shows this instead of a spinner). */
  refreshProgress: { done: number; total: number } | null;
  /** Set when the phone ran out of space and the app gave something up. Never silent. */
  storageNotice: StorageNotice | null;
}

type Listener = () => void;

let state: AppState = {
  hydrated: false,
  onboarded: false,
  household: householdRepo.get(),
  checklist: {},
  taskChecks: {},
  alerts: [],
  shelters: [],
  shelterSource: 'bundle',
  forecast: null,
  cacheMeta: {},
  settings: settingsRepo.get(),
  network: { online: null, type: null },
  location: null,
  locationStatus: 'idle',
  lastRefreshAt: null,
  refreshing: false,
  refreshProgress: null,
  storageNotice: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function setState(patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function getState(): AppState {
  return state;
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Synchronous hydration from disk. Safe to call more than once. */
export function hydrate(): AppState {
  initStorage();
  const src = shelterRepo.get();
  state = {
    ...state,
    hydrated: true,
    onboarded: householdRepo.isOnboarded(),
    household: householdRepo.get(),
    checklist: checklistRepo.getAll(),
    taskChecks: checklistRepo.getTaskChecks(),
    alerts: alertRepo.getAll(),
    shelters: src.shelters,
    shelterSource: src.source,
    forecast: forecastRepo.get(),
    cacheMeta: cacheMetaRepo.getAll(),
    settings: settingsRepo.get(),
    location: locationRepo.get(),
    storageNotice: storageNoticeRepo.get(),
  };
  emit();
  return state;
}

// An eviction changes what is on disk, so re-read the affected slices along with the notice.
onStorageNotice((notice) => {
  setState({ storageNotice: notice, forecast: forecastRepo.get(), alerts: alertRepo.getAll(), cacheMeta: cacheMetaRepo.getAll() });
});

// ---------- Selectors / hooks ----------

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function useAppStore(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---------- Actions (local-first) ----------

export const actions = {
  saveHousehold(h: Household, opts: { finishOnboarding?: boolean } = {}) {
    const clean = householdRepo.set({ ...h, rulesVersion: RULES_VERSION, updatedAt: nowIso() });
    if (opts.finishOnboarding) householdRepo.setOnboarded(true);
    setState({ household: clean, onboarded: opts.finishOnboarding ? true : state.onboarded });
    return clean;
  },
  skipOnboarding() {
    householdRepo.setOnboarded(true);
    setState({ onboarded: true });
  },
  toggleChecklistItem(itemId: string, done: boolean, qty: number | null, unit: string) {
    const next = checklistRepo.toggle(itemId, done, qty, unit, nowIso());
    setState({ checklist: next });
  },
  toggleTask(taskId: string, done: boolean) {
    setState({ taskChecks: checklistRepo.toggleTask(taskId, done) });
  },
  setAlerts(alerts: StoredAlert[]) {
    setState({ alerts: alertRepo.replaceAll(alerts) });
  },
  setAlertSummary(alertId: string, summary: string | null, status: StoredAlert['summaryStatus']) {
    setState({ alerts: alertRepo.setSummary(alertId, summary, status, nowIso()) });
  },
  setShelters(shelters: Shelter[], source: 'bundle' | 'network') {
    setState({ shelters, shelterSource: source });
  },
  setForecast(f: WindForecast | null) {
    // If the write fails (disk full) the forecast still serves this session; it is simply gone after a restart.
    if (f) forecastRepo.set(f);
    setState({ forecast: f });
  },
  setCacheMeta(meta: CacheMetaMap) {
    setState({ cacheMeta: meta });
  },
  patchSettings(p: Partial<Settings>) {
    setState({ settings: settingsRepo.patch(p) });
  },
  setNetwork(n: NetworkInfo) {
    setState({ network: n });
  },
  setLocation(fix: LocationFix | null, status: AppState['locationStatus']) {
    if (fix) locationRepo.set(fix);
    setState({ location: fix ?? state.location, locationStatus: status });
  },
  setRefreshing(refreshing: boolean, lastRefreshAt?: number) {
    setState({ refreshing, ...(refreshing ? {} : { refreshProgress: null }), ...(lastRefreshAt !== undefined ? { lastRefreshAt } : {}) });
  },
  setRefreshProgress(done: number, total: number) {
    setState({ refreshProgress: { done, total } });
  },
  dismissStorageNotice() {
    storageNoticeRepo.clear();
    setState({ storageNotice: null });
  },
  rehydrate() {
    hydrate();
  },
};

/** Effective "offline" flag: real network state, or the demo override. */
export function isOfflineNow(s: AppState = state): boolean {
  if (s.settings.simulateOffline) return true;
  return s.network.online === false;
}
