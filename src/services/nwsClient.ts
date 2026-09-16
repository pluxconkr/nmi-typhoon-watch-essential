/**
 * NWS API client. Public, no key. A User-Agent is REQUIRED (missing UA → 403).
 * Online-only: callers must gate on network state; this never runs when offline.
 */
import type { NwsFeature, NwsFeatureCollection } from '@/domain/nws';

export const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?area=MP';
export const NWS_USER_AGENT = 'NMITyphoonWatch/1.0 (nmi-typhoon-watch; contact: hsem-app@example.org)';
const TIMEOUT_MS = 10_000;

interface NwsFeatureWithGeocode extends NwsFeature {
  properties: NwsFeature['properties'] & { geocode?: { UGC?: string[] } };
}

/** Keep land-zone products (UGC codes MPZnnn / MPCnnn); drop marine-only (PMZnnn) duplicates. */
export function isLandFeature(f: NwsFeature): boolean {
  const ugc = (f as NwsFeatureWithGeocode).properties?.geocode?.UGC;
  if (!ugc || ugc.length === 0) return true;
  return ugc.some((u) => /^MP[ZC]/.test(u));
}

export async function fetchActiveAlerts(signal?: AbortSignal): Promise<NwsFeature[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(NWS_ALERTS_URL, {
      headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`NWS HTTP ${res.status}`);
    const body = (await res.json()) as NwsFeatureCollection;
    return (body.features ?? []).filter(isLandFeature);
  } finally {
    clearTimeout(timer);
  }
}
