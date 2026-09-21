/**
 * Domain types for NMI Typhoon Watch.
 *
 * Everything here is plain data that can be JSON-serialised into local storage.
 * No Expo / React Native imports — this module is shared by unit tests, the
 * client app, and the server-side API route.
 */

export type Island = 'saipan' | 'tinian' | 'rota';

/** Supply period in days. 3 = FEMA minimum, 14 ≈ Saipan's real recovery time. */
export type PrepDays = 3 | 7 | 14;

export interface Household {
  people: number;
  elders: number;
  infants: number;
  pets: number;
  generator: boolean;
  prepDays: PrepDays;
  island: Island;
  village?: string;
  /** Version of the rules table the checklist was last computed with. */
  rulesVersion: string;
  /** ISO 8601 timestamp of the last edit (device clock). */
  updatedAt: string;
}

/** Persisted check state for one checklist item. Local-first, never waits on a server. */
export interface ChecklistState {
  itemId: string;
  done: boolean;
  /** Quantity that was required at the moment the item was checked (audit + shortfall). */
  qtyAtCheck: number | null;
  unit: string;
  /** ISO 8601 device time. */
  doneAt: string;
  source: 'local';
}

export type ChecklistStateMap = Record<string, ChecklistState>;

/** A computed checklist row — output of the rules table, never of an LLM. */
export interface ChecklistItem {
  id: string;
  name: string;
  /** null = presence-only item (e.g. documents). */
  qty: number | null;
  unit: string;
  /** Human-readable multiplication, e.g. "4 L × 3 days × 5 people = 60 L". */
  formula: string;
  /** Plain-English rationale shown in "Why this number?". */
  why: string;
  /** Source organisation for the rule (FEMA, Red Cross, …). */
  source: string;
  /** Emphasised as required (e.g. medication when elders > 0). */
  required?: boolean;
  /** Included in the shelter "what to bring" list. */
  bringToShelter?: boolean;
}

export type Severity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';

/** A normalised NWS alert as stored on the phone. Raw text and summary are ALWAYS stored together. */
export interface StoredAlert {
  alertId: string;
  event: string;
  severity: Severity;
  urgency: string;
  certainty: string;
  areaDesc: string;
  headline: string | null;
  /** Full official description text, unedited. */
  description: string;
  instruction: string | null;
  senderName: string;
  /** ISO 8601 with offset as sent by NWS, e.g. 2026-09-05T14:00:00+10:00 */
  sent: string;
  effective: string | null;
  onset: string | null;
  expires: string | null;
  ends: string | null;
  /** Link to the official record. */
  sourceUrl: string;
  /** Raw VTEC string when present (e.g. /O.NEW.PGUM.TY.W.0003.260414T0600Z-260416T0000Z/). */
  vtec: string | null;
  /** One-sentence plain-language summary (server-side LLM). null when unavailable. */
  plainSummary: string | null;
  summaryStatus: 'ok' | 'unavailable' | 'pending';
  /** When the summary was generated (ISO). */
  summaryAt: string | null;
  /** When THIS PHONE received the alert (device clock, ISO). Used for ordering + retention. */
  receivedAt: string;
  /** True for bundled demo alerts — the UI must label these clearly. */
  isDemo?: boolean;
}

export interface Shelter {
  shelterId: string;
  name: string;
  island: Island;
  village: string;
  lat: number;
  lng: number;
  /** Design capacity (planning number), NOT live availability. */
  designCapacity: number | null;
  petsAllowed: boolean | null;
  wheelchair: boolean | null;
  generator: boolean | null;
  phone: string | null;
  /** Pre-written landmark directions — never generated at runtime. */
  landmarkHint: string;
  /** ISO date the record was last verified against the official list. */
  lastVerified: string;
  verifiedBy: string;
  coordConfidence?: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface WaterPoint {
  id: string;
  name: string;
  village: string;
  hours: string;
  lat: number | null;
  lng: number | null;
  /** ISO date the record was last updated. */
  lastVerified: string;
  note?: string;
}

export interface FaqEntry {
  id: string;
  section: 'during' | 'after';
  title: string;
  body: string;
  source: string;
  sourceUrl?: string;
}

/** One hourly forecast row (Open-Meteo), already in app units (mph, mm). */
export interface WindHour {
  /** UTC epoch ms for the END of the hour (Open-Meteo label time). */
  t: number;
  wind: number | null;
  gust: number | null;
  precip: number | null;
}

export interface WindForecast {
  v: 1;
  /** Device epoch ms when received. */
  fetchedAt: number;
  utcOffsetSeconds: number;
  grid: { lat: number; lon: number; elevationM: number };
  hourly: WindHour[];
  current?: { t: number; wind: number | null; gust: number | null; precip: number | null };
  attribution: 'Weather data by Open-Meteo.com';
  attributionUrl: 'https://open-meteo.com/';
}

export type AssetKey = 'shelters' | 'forecast' | 'alerts' | 'faq' | 'map';

/** What the app gave up when the phone ran out of space (S-10: never fail silently). */
export type DroppedItem = 'forecast' | 'alert-history';
export interface StorageNotice {
  /** ISO timestamp of the eviction. */
  at: string;
  dropped: DroppedItem[];
  /** Free bytes reported by the OS at that moment, or null if unknown. */
  freeBytes: number | null;
  /** false when even after eviction the write could not be saved. */
  recovered: boolean;
}

/** Every cached blob carries a time stamp. A cache entry without one is a bug. */
export interface CacheMeta {
  key: AssetKey;
  /** ISO timestamp of the last successful network refresh, or null if only the bundled copy exists. */
  fetchedAt: string | null;
  source: 'bundle' | 'network';
  bytes: number;
  version: string;
}

export type CacheMetaMap = Partial<Record<AssetKey, CacheMeta>>;

export type Phase = 'none' | 'before' | 'during' | 'after';

export type PrepWindow = '72h' | '48h' | '24h' | '6h';

export interface TaskItem {
  id: string;
  title: string;
  note?: string;
}

/** Demo scenario override used for judging/video. 'live' = derive from real data. */
export type DemoScenario = 'live' | 'before' | 'during' | 'after' | 'calm';

export interface Settings {
  demoScenario: DemoScenario;
  /** Simulate offline in the UI regardless of the real network state (demo only). */
  simulateOffline: boolean;
  notificationsEnabled: boolean;
}

export interface LocationFix {
  lat: number;
  lng: number;
  accuracyM: number | null;
  /** Epoch ms. */
  at: number;
}
