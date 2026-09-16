/**
 * Local-first repositories. Every read is synchronous and starts from local storage
 * (or the bundled fallback). Nothing here touches the network.
 */
import bundledFaq from '@/assets/data/faq.json';
import bundledShelters from '@/assets/data/shelters.json';
import bundledWaterPoints from '@/assets/data/water-points.json';
import { RULES_VERSION, sanitizeHousehold } from '@/domain/rules';
import { pruneAlerts } from '@/domain/nws';
import type {
  AssetKey,
  CacheMeta,
  CacheMetaMap,
  ChecklistState,
  ChecklistStateMap,
  FaqEntry,
  Household,
  LocationFix,
  Settings,
  Shelter,
  StoredAlert,
  WaterPoint,
  WindForecast,
} from '@/domain/types';
import { files } from './files';
import { kv } from './kv';

export const KEYS = {
  schema: 'meta:schemaVersion',
  onboarded: 'onboarded:v1',
  household: 'household:v1',
  checklist: 'checklist:v1',
  taskChecks: 'taskChecks:v1',
  alerts: 'alerts:v1',
  cacheMeta: 'cacheMeta:v1',
  settings: 'settings:v1',
  forecast: 'forecast:v1',
  lastFix: 'location:lastFix:v1',
  notifiedIds: 'notified:v1',
} as const;

export const SCHEMA_VERSION = 1;

/** Call once at startup, synchronously, before any async storage access. */
export function initStorage(): void {
  const v = kv.get<number>(KEYS.schema);
  if (v !== SCHEMA_VERSION) kv.set(KEYS.schema, SCHEMA_VERSION);
}

// ---------- Household / onboarding ----------

export const householdRepo = {
  get(): Household {
    return sanitizeHousehold(kv.get<Household>(KEYS.household));
  },
  set(h: Household): Household {
    const clean = sanitizeHousehold({ ...h, rulesVersion: RULES_VERSION });
    kv.set(KEYS.household, clean);
    return clean;
  },
  isOnboarded(): boolean {
    return kv.get<boolean>(KEYS.onboarded) === true;
  },
  setOnboarded(v: boolean): void {
    kv.set(KEYS.onboarded, v);
  },
};

// ---------- Checklist state (local-first, atomic) ----------

export const checklistRepo = {
  getAll(): ChecklistStateMap {
    return kv.get<ChecklistStateMap>(KEYS.checklist) ?? {};
  },
  toggle(itemId: string, done: boolean, qty: number | null, unit: string, nowIso: string): ChecklistStateMap {
    return kv.update<ChecklistStateMap>(KEYS.checklist, (prev) => ({
      ...(prev ?? {}),
      [itemId]: { itemId, done, qtyAtCheck: done ? qty : null, unit, doneAt: nowIso, source: 'local' } satisfies ChecklistState,
    }));
  },
  /** Task checks for the "Do these 3 today" cards (window/during/after tasks). */
  getTaskChecks(): Record<string, boolean> {
    return kv.get<Record<string, boolean>>(KEYS.taskChecks) ?? {};
  },
  toggleTask(taskId: string, done: boolean): Record<string, boolean> {
    return kv.update<Record<string, boolean>>(KEYS.taskChecks, (prev) => ({ ...(prev ?? {}), [taskId]: done }));
  },
};

// ---------- Alerts (history, retention 50 / 90 days) ----------

export const alertRepo = {
  getAll(): StoredAlert[] {
    return kv.get<StoredAlert[]>(KEYS.alerts) ?? [];
  },
  replaceAll(alerts: StoredAlert[], now: number = Date.now()): StoredAlert[] {
    const pruned = pruneAlerts(alerts, now);
    kv.set(KEYS.alerts, pruned);
    return pruned;
  },
  upsert(alert: StoredAlert, now: number = Date.now()): StoredAlert[] {
    return kv.update<StoredAlert[]>(KEYS.alerts, (prev) => {
      const list = (prev ?? []).filter((a) => a.alertId !== alert.alertId);
      list.push(alert);
      return pruneAlerts(list, now);
    });
  },
  setSummary(alertId: string, summary: string | null, status: StoredAlert['summaryStatus'], at: string): StoredAlert[] {
    return kv.update<StoredAlert[]>(KEYS.alerts, (prev) =>
      (prev ?? []).map((a) => (a.alertId === alertId ? { ...a, plainSummary: summary, summaryStatus: status, summaryAt: at } : a)),
    );
  },
  getNotifiedIds(): string[] {
    return kv.get<string[]>(KEYS.notifiedIds) ?? [];
  },
  markNotified(ids: string[]): void {
    kv.update<string[]>(KEYS.notifiedIds, (prev) => Array.from(new Set([...(prev ?? []), ...ids])).slice(-200));
  },
};

// ---------- Shelters (downloaded copy → bundled fallback) ----------

const SHELTERS_FILE = 'shelters.json';

export interface ShelterSource {
  shelters: Shelter[];
  /** 'network' when a downloaded copy exists, else 'bundle'. */
  source: 'bundle' | 'network';
}

export const shelterRepo = {
  get(): ShelterSource {
    const downloaded = files.readJsonSync<{ shelters?: Shelter[] }>(SHELTERS_FILE);
    if (downloaded?.shelters && Array.isArray(downloaded.shelters) && downloaded.shelters.length > 0) {
      return { shelters: downloaded.shelters, source: 'network' };
    }
    return { shelters: bundledShelters.shelters as Shelter[], source: 'bundle' };
  },
  bundledVersion(): string {
    return bundledShelters.version;
  },
  saveDownloaded(payload: { shelters: Shelter[]; version: string }): number {
    return files.writeJson(SHELTERS_FILE, payload);
  },
  removeDownloaded(): void {
    files.remove(SHELTERS_FILE);
  },
  bytes(): number {
    return files.bytesOf(SHELTERS_FILE);
  },
};

export const waterPointRepo = {
  get(): { points: WaterPoint[]; lastVerified: string } {
    return { points: bundledWaterPoints.points as WaterPoint[], lastVerified: bundledWaterPoints.lastVerified };
  },
};

export const faqRepo = {
  get(): FaqEntry[] {
    return bundledFaq.entries as FaqEntry[];
  },
};

// ---------- Forecast ----------

export const forecastRepo = {
  get(): WindForecast | null {
    return kv.get<WindForecast>(KEYS.forecast);
  },
  set(f: WindForecast): void {
    kv.set(KEYS.forecast, f);
  },
};

// ---------- Cache metadata (every cached thing has a time stamp) ----------

export const cacheMetaRepo = {
  getAll(): CacheMetaMap {
    return kv.get<CacheMetaMap>(KEYS.cacheMeta) ?? {};
  },
  set(meta: CacheMeta): CacheMetaMap {
    return kv.update<CacheMetaMap>(KEYS.cacheMeta, (prev) => ({ ...(prev ?? {}), [meta.key]: meta }));
  },
  remove(key: AssetKey): CacheMetaMap {
    return kv.update<CacheMetaMap>(KEYS.cacheMeta, (prev) => {
      const next = { ...(prev ?? {}) };
      delete next[key];
      return next;
    });
  },
};

// ---------- Settings ----------

export const DEFAULT_SETTINGS: Settings = { demoScenario: 'live', simulateOffline: false, notificationsEnabled: true };

export const settingsRepo = {
  get(): Settings {
    return { ...DEFAULT_SETTINGS, ...(kv.get<Partial<Settings>>(KEYS.settings) ?? {}) };
  },
  patch(p: Partial<Settings>): Settings {
    return kv.update<Settings>(KEYS.settings, (prev) => ({ ...DEFAULT_SETTINGS, ...(prev ?? {}), ...p }));
  },
};

// ---------- Last GPS fix ----------

export const locationRepo = {
  get(): LocationFix | null {
    return kv.get<LocationFix>(KEYS.lastFix);
  },
  set(fix: LocationFix): void {
    kv.set(KEYS.lastFix, fix);
  },
};

/** Wipe everything (Downloads screen → "Reset app data"). */
export function resetAllData(): void {
  kv.clear();
  shelterRepo.removeDownloaded();
  initStorage();
}
