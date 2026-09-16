/**
 * NWS alert normalisation, merging and retention. Pure functions.
 *
 * Input shape: GeoJSON features from https://api.weather.gov/alerts/active?area=MP
 * (CAP-derived properties). We store the official text unedited and never
 * re-interpret severity — the NWS value is passed through as-is.
 */
import type { Severity, StoredAlert } from './types';
import { toEpoch } from './time';

/** Minimal typing of the NWS GeoJSON feature we consume. Extra fields are ignored. */
export interface NwsFeature {
  id?: string;
  properties: {
    id?: string;
    event?: string;
    severity?: string;
    urgency?: string;
    certainty?: string;
    areaDesc?: string;
    headline?: string | null;
    description?: string | null;
    instruction?: string | null;
    senderName?: string;
    sent?: string;
    effective?: string | null;
    onset?: string | null;
    expires?: string | null;
    ends?: string | null;
    '@id'?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface NwsFeatureCollection {
  features?: NwsFeature[];
}

export const ALERT_RETENTION_MAX = 50;
export const ALERT_RETENTION_DAYS = 90;

const SEVERITIES: Severity[] = ['Extreme', 'Severe', 'Moderate', 'Minor'];

export function toSeverity(raw: string | undefined): Severity {
  return (SEVERITIES as string[]).includes(raw ?? '') ? (raw as Severity) : 'Unknown';
}

/** Tropical-cyclone class events. Watches/warnings for typhoon, tropical storm, hurricane. */
export function isTyphoonClass(event: string | undefined | null): boolean {
  if (!event) return false;
  const e = event.toLowerCase();
  return /typhoon|tropical storm|hurricane|tropical cyclone/.test(e);
}

export function isWarning(event: string | undefined | null): boolean {
  return /warning/i.test(event ?? '');
}

export function isWatch(event: string | undefined | null): boolean {
  return /watch/i.test(event ?? '');
}

function firstString(v: unknown): string | null {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : null;
  return typeof v === 'string' ? v : null;
}

/** Extract the VTEC string from CAP parameters, if any. */
export function extractVtec(parameters: Record<string, unknown> | undefined): string | null {
  if (!parameters) return null;
  return firstString(parameters.VTEC) ?? firstString(parameters.vtec);
}

export interface VtecInfo {
  action: string; // NEW CON EXT EXA EXB UPG CAN EXP COR ROU
  office: string;
  phenomenon: string; // TY TR HU FF ...
  significance: string; // W A Y S
  eventNumber: string;
  begin: string | null; // ISO (UTC)
  end: string | null;
}

/** Parse a P-VTEC string like /O.NEW.PGUM.TY.W.0003.260414T0600Z-260416T0000Z/ */
export function parseVtec(vtec: string | null | undefined): VtecInfo | null {
  if (!vtec) return null;
  const m = vtec.match(/\/?[OTEX]\.([A-Z]{3})\.([A-Z]{4})\.([A-Z]{2})\.([A-Z])\.(\d{4})\.(\d{6}T\d{4}Z|000000T0000Z)-(\d{6}T\d{4}Z|000000T0000Z)\/?/);
  if (!m) return null;
  const toIso = (s: string): string | null => {
    if (s === '000000T0000Z') return null;
    const yy = s.slice(0, 2);
    const mm = s.slice(2, 4);
    const dd = s.slice(4, 6);
    const hh = s.slice(7, 9);
    const mi = s.slice(9, 11);
    return `20${yy}-${mm}-${dd}T${hh}:${mi}:00Z`;
  };
  return {
    action: m[1],
    office: m[2],
    phenomenon: m[3],
    significance: m[4],
    eventNumber: m[5],
    begin: toIso(m[6]),
    end: toIso(m[7]),
  };
}

/** Whether a VTEC action means the product was cancelled/expired (all clear for that product). */
export function vtecIsEnded(vtec: string | null | undefined): boolean {
  const info = parseVtec(vtec);
  return !!info && (info.action === 'CAN' || info.action === 'EXP');
}

/**
 * Normalise a raw NWS feature into a StoredAlert. `receivedAt` is the device clock.
 * Existing summary fields are preserved when re-normalising an alert we already have.
 */
export function normalizeFeature(
  feature: NwsFeature,
  receivedAt: string,
  existing?: Pick<StoredAlert, 'plainSummary' | 'summaryStatus' | 'summaryAt' | 'receivedAt'> | null,
): StoredAlert | null {
  const p = feature.properties ?? {};
  const alertId = p.id ?? feature.id ?? p['@id'];
  if (!alertId || !p.event) return null;
  return {
    alertId,
    event: p.event,
    severity: toSeverity(p.severity),
    urgency: p.urgency ?? 'Unknown',
    certainty: p.certainty ?? 'Unknown',
    areaDesc: p.areaDesc ?? '',
    headline: p.headline ?? null,
    description: p.description ?? '',
    instruction: p.instruction ?? null,
    senderName: p.senderName ?? 'NWS',
    sent: p.sent ?? receivedAt,
    effective: p.effective ?? null,
    onset: p.onset ?? null,
    expires: p.expires ?? null,
    ends: p.ends ?? null,
    sourceUrl: p['@id'] ?? (typeof alertId === 'string' && alertId.startsWith('http') ? alertId : `https://api.weather.gov/alerts/${encodeURIComponent(alertId)}`),
    vtec: extractVtec(p.parameters),
    plainSummary: existing?.plainSummary ?? null,
    summaryStatus: existing?.summaryStatus ?? 'pending',
    summaryAt: existing?.summaryAt ?? null,
    receivedAt: existing?.receivedAt ?? receivedAt,
  };
}

export interface MergeResult {
  alerts: StoredAlert[];
  /** Ids that were not in the previous list — candidates for a notification. */
  newIds: string[];
}

/**
 * Merge freshly fetched features into the stored list. Existing alerts keep their
 * receivedAt and summary; new ones get receivedAt = now. Result is sorted newest-received first
 * and pruned to the retention policy.
 */
export function mergeAlerts(existing: StoredAlert[], features: NwsFeature[], now: number = Date.now()): MergeResult {
  const receivedAt = new Date(now).toISOString();
  const byId = new Map(existing.map((a) => [a.alertId, a] as const));
  const newIds: string[] = [];
  for (const f of features) {
    const id = f.properties?.id ?? f.id;
    const prev = id ? byId.get(id) : undefined;
    const norm = normalizeFeature(f, receivedAt, prev);
    if (!norm) continue;
    if (!prev) newIds.push(norm.alertId);
    // Keep demo flag off for anything that came from the network.
    byId.set(norm.alertId, { ...norm, isDemo: undefined });
  }
  const merged = pruneAlerts(Array.from(byId.values()), now);
  return { alerts: merged, newIds };
}

/** Sort newest-received first, then cap to 50 items or 90 days, whichever is reached first. */
export function pruneAlerts(alerts: StoredAlert[], now: number = Date.now()): StoredAlert[] {
  const cutoff = now - ALERT_RETENTION_DAYS * 24 * 3600_000;
  return [...alerts]
    .sort((a, b) => toEpoch(b.receivedAt) - toEpoch(a.receivedAt))
    .filter((a) => {
      const r = toEpoch(a.receivedAt);
      return !Number.isFinite(r) || r >= cutoff;
    })
    .slice(0, ALERT_RETENTION_MAX);
}

/** True if the alert is still in force at `now` (expires/ends in the future). */
export function isActive(alert: StoredAlert, now: number = Date.now()): boolean {
  if (vtecIsEnded(alert.vtec)) return false;
  const end = toEpoch(alert.ends ?? alert.expires);
  return Number.isFinite(end) ? end > now : false;
}

/** Best guess of the storm name from NWS text, e.g. "TYPHOON HALONG" → "Typhoon Halong". */
const GENERIC_AFTER_KIND = /^(Warning|Warnings|Watch|Watches|Condition|Conditions|Force|Season|Center|Shelter|Shelters|Readiness|Local|Statement|Is|Has|Will|Remains|Moving|Winds|Wind|Information|Effects)$/i;
const KIND_LABEL: Record<string, string> = { sty: 'Super Typhoon', ty: 'Typhoon', ts: 'Tropical Storm', td: 'Tropical Depression' };

export function extractStormName(alert: Pick<StoredAlert, 'headline' | 'description' | 'event'>): string | null {
  const text = `${alert.headline ?? ''}\n${alert.description ?? ''}`;
  const re = /\b(SUPER TYPHOON|TYPHOON|TROPICAL STORM|HURRICANE|TROPICAL DEPRESSION|STY|TY|TS|TD)\s+([A-Z][A-Za-z-]{2,})\b/gi;
  for (const m of text.matchAll(re)) {
    const rawKind = m[1];
    const name = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    // Skip generic words that follow "Typhoon" in prose (e.g. "TYPHOON WARNING", "TYPHOON CONDITION").
    if (GENERIC_AFTER_KIND.test(name)) continue;
    // Abbreviations must be upper-case and followed by a capitalised proper name.
    if (rawKind.length <= 3 && (rawKind !== rawKind.toUpperCase() || !/^[A-Z][a-z]/.test(m[2]))) continue;
    const kind = KIND_LABEL[rawKind.toLowerCase()] ?? rawKind.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    return `${kind} ${name}`;
  }
  return null;
}

/** Extract "Category N" if present in the text. */
export function extractCategory(alert: Pick<StoredAlert, 'headline' | 'description'>): string | null {
  const m = `${alert.headline ?? ''}\n${alert.description ?? ''}`.match(/\bCATEGORY\s+([1-5])\b/i);
  return m ? `Category ${m[1]}` : null;
}
