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
  DroppedItem,
  FaqEntry,
  Household,
  LocationFix,
  Settings,
  Shelter,
  StorageNotice,
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
  storageNotice: 'storageNotice:v1',
} as const;

export const SCHEMA_VERSION = 1;

/** Call once at startup, synchronously, before any async storage access. */
export function initStorage(): void {
  const v = kv.get<number>(KEYS.schema);
  if (v !== SCHEMA_VERSION) kv.set(KEYS.schema, SCHEMA_VERSION);
}

// ---------- Storage guard (S-10 "low storage": drop by priority, say what was dropped) ----------

/** Below this much free space the app stops keeping data it can download again. */
export const LOW_SPACE_BYTES = 5 * 1024 * 1024;
/** Notices kept when space runs out: the newest ones. Older ones can be re-read online. */
export const LOW_SPACE_ALERT_KEEP = 10;

type NoticeListener = (n: StorageNotice) => void;
let noticeListener: NoticeListener | null = null;
/** The store subscribes so the UI can say what was given up. */
export function onStorageNotice(l: NoticeListener | null): void {
  noticeListener = l;
}

export function isLowOnSpace(): boolean {
  const free = files.availableBytes();
  return Number.isFinite(free) && free < LOW_SPACE_BYTES;
}

/**
 * Give up re-downloadable data, cheapest loss first: the wind forecast, then older notices.
 * Household, checklist, shelters, map and FAQ are never dropped.
 */
export function dropLowPriority(): DroppedItem[] {
  const dropped: DroppedItem[] = [];
  if (kv.get<WindForecast>(KEYS.forecast) != null) {
    kv.remove(KEYS.forecast);
    kv.update<CacheMetaMap>(KEYS.cacheMeta, (prev) => {
      const next = { ...(prev ?? {}) };
      delete next.forecast;
      return next;
    });
    dropped.push('forecast');
  }
  const alerts = kv.get<StoredAlert[]>(KEYS.alerts) ?? [];
  if (alerts.length > LOW_SPACE_ALERT_KEEP) {
    kv.set(KEYS.alerts, pruneAlerts(alerts).slice(0, LOW_SPACE_ALERT_KEEP));
    dropped.push('alert-history');
  }
  return dropped;
}

/** Record and announce an eviction. Silent failure is the one thing this must never be. */
export function reportStorageNotice(dropped: DroppedItem[], recovered: boolean): StorageNotice | null {
  if (dropped.length === 0 && recovered) return null;
  const free = files.availableBytes();
  const notice: StorageNotice = { at: new Date().toISOString(), dropped, freeBytes: Number.isFinite(free) ? free : null, recovered };
  kv.set(KEYS.storageNotice, notice);
  noticeListener?.(notice);
  return notice;
}

/** Write; if the disk is full, evict by priority and try once more (optionally with a smaller value). */
function guardedSet<T>(key: string, value: T, shrink?: (v: T) => T): T {
  if (kv.set(key, value)) return value;
  const dropped = dropLowPriority();
  const retry = shrink ? shrink(value) : value;
  const ok = kv.set(key, retry);
  reportStorageNotice(dropped, ok);
  return retry;
}

function guardedUpdate<T>(key: string, fn: (prev: T | null) => T, shrink?: (v: T) => T): T {
  const next = kv.update<T>(key, fn);
  if (kv.lastWriteOk) return next;
  const dropped = dropLowPriority();
  const retried = kv.update<T>(key, (prev) => (shrink ? shrink(fn(prev)) : fn(prev)));
  reportStorageNotice(dropped, kv.lastWriteOk);
  return retried;
}

const keepNewest = (list: StoredAlert[]) => list.slice(0, LOW_SPACE_ALERT_KEEP);

export const storageNoticeRepo = {
  get(): StorageNotice | null {
    return kv.get<StorageNotice>(KEYS.storageNotice);
  },
  clear(): void {
    kv.remove(KEYS.storageNotice);
  },
};

// ---------- Household / onboarding ----------

export const householdRepo = {
  get(): Household {
    return sanitizeHousehold(kv.get<Household>(KEYS.household));
  },
  set(h: Household): Household {
    const clean = sanitizeHousehold({ ...h, rulesVersion: RULES_VERSION });
    guardedSet(KEYS.household, clean);
    return clean;
  },
  isOnboarded(): boolean {
    return kv.get<boolean>(KEYS.onboarded) === true;
  },
  setOnboarded(v: boolean): void {
    guardedSet(KEYS.onboarded, v);
  },
};

// ---------- Checklist state (local-first, atomic) ----------

export const checklistRepo = {
  getAll(): ChecklistStateMap {
    return kv.get<ChecklistStateMap>(KEYS.checklist) ?? {};
  },
  toggle(itemId: string, done: boolean, qty: number | null, unit: string, nowIso: string): ChecklistStateMap {
    return guardedUpdate<ChecklistStateMap>(KEYS.checklist, (prev) => ({
      ...(prev ?? {}),
      [itemId]: { itemId, done, qtyAtCheck: done ? qty : null, unit, doneAt: nowIso, source: 'local' } satisfies ChecklistState,
    }));
  },
  /** Task checks for the "Do these 3 today" cards (window/during/after tasks). */
  getTaskChecks(): Record<string, boolean> {
    return kv.get<Record<string, boolean>>(KEYS.taskChecks) ?? {};
  },
  toggleTask(taskId: string, done: boolean): Record<string, boolean> {
    return guardedUpdate<Record<string, boolean>>(KEYS.taskChecks, (prev) => ({ ...(prev ?? {}), [taskId]: done }));
  },
};

// ---------- Alerts (history, retention 50 / 90 days) ----------

export const alertRepo = {
  getAll(): StoredAlert[] {
    return kv.get<StoredAlert[]>(KEYS.alerts) ?? [];
  },
  replaceAll(alerts: StoredAlert[], now: number = Date.now()): StoredAlert[] {
    return guardedSet(KEYS.alerts, pruneAlerts(alerts, now), keepNewest);
  },
  upsert(alert: StoredAlert, now: number = Date.now()): StoredAlert[] {
    return guardedUpdate<StoredAlert[]>(
      KEYS.alerts,
      (prev) => {
        const list = (prev ?? []).filter((a) => a.alertId !== alert.alertId);
        list.push(alert);
        return pruneAlerts(list, now);
      },
      keepNewest,
    );
  },
  setSummary(alertId: string, summary: string | null, status: StoredAlert['summaryStatus'], at: string): StoredAlert[] {
    return guardedUpdate<StoredAlert[]>(
      KEYS.alerts,
      (prev) => (prev ?? []).map((a) => (a.alertId === alertId ? { ...a, plainSummary: summary, summaryStatus: status, summaryAt: at } : a)),
      keepNewest,
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
  /** The forecast is the first thing given up when space runs out, so a failed write is not retried. */
  set(f: WindForecast): boolean {
    if (kv.set(KEYS.forecast, f)) return true;
    reportStorageNotice(['forecast'], true);
    return false;
  },
};

// ---------- Cache metadata (every cached thing has a time stamp) ----------

export const cacheMetaRepo = {
  getAll(): CacheMetaMap {
    return kv.get<CacheMetaMap>(KEYS.cacheMeta) ?? {};
  },
  set(meta: CacheMeta): CacheMetaMap {
    return guardedUpdate<CacheMetaMap>(KEYS.cacheMeta, (prev) => ({ ...(prev ?? {}), [meta.key]: meta }));
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
    return guardedUpdate<Settings>(KEYS.settings, (prev) => ({ ...DEFAULT_SETTINGS, ...(prev ?? {}), ...p }));
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
