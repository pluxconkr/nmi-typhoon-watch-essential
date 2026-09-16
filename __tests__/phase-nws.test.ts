import {
  ALERT_RETENTION_MAX,
  extractCategory,
  extractStormName,
  isActive,
  isTyphoonClass,
  mergeAlerts,
  normalizeFeature,
  parseVtec,
  pruneAlerts,
  vtecIsEnded,
  type NwsFeature,
} from '@/domain/nws';
import { AFTER_WINDOW_HOURS, derivePhase, estimateOnsetFromForecast } from '@/domain/phase';
import { toEpoch } from '@/domain/time';
import type { StoredAlert, WindForecast } from '@/domain/types';

const HOUR = 3600_000;
const NOW = toEpoch('2026-04-13T12:00:00+10:00'); // Mon 13 Apr 2026 12:00 ChST

function feature(over: Partial<NwsFeature['properties']> & { id: string }): NwsFeature {
  return {
    id: over.id,
    properties: {
      '@id': `https://api.weather.gov/alerts/${over.id}`,
      event: 'Typhoon Warning',
      severity: 'Extreme',
      urgency: 'Immediate',
      certainty: 'Likely',
      areaDesc: 'Rota, MP; Tinian, MP; Saipan, MP',
      headline: 'Typhoon Warning issued April 12 at 3:56PM ChST by NWS Tiyan GU',
      description: '...TYPHOON WARNING IN EFFECT...\n\nAs Typhoon Sinlaku (04W) moves closer, the threat for sustained high winds will continue to increase.',
      senderName: 'NWS Tiyan GU',
      sent: '2026-04-12T15:56:00+10:00',
      effective: '2026-04-12T15:56:00+10:00',
      onset: '2026-04-12T15:56:00+10:00',
      expires: '2026-04-13T00:00:00+10:00',
      ends: null,
      parameters: { VTEC: ['/O.NEW.PGUM.TY.W.4004.260412T0551Z-000000T0000Z/'] },
      ...over,
    },
  };
}

function stored(over: Partial<StoredAlert> & { alertId: string }): StoredAlert {
  return {
    event: 'Typhoon Warning',
    severity: 'Extreme',
    urgency: 'Immediate',
    certainty: 'Likely',
    areaDesc: 'Saipan, MP',
    headline: null,
    description: 'Typhoon Sinlaku (04W)',
    instruction: null,
    senderName: 'NWS Tiyan GU',
    sent: new Date(NOW - 2 * HOUR).toISOString(),
    effective: null,
    onset: null,
    expires: null,
    ends: null,
    sourceUrl: 'x',
    vtec: null,
    plainSummary: null,
    summaryStatus: 'pending',
    summaryAt: null,
    receivedAt: new Date(NOW - 2 * HOUR).toISOString(),
    ...over,
  };
}

describe('NWS normalisation', () => {
  test('normalizeFeature keeps official text verbatim and stamps receivedAt', () => {
    const a = normalizeFeature(feature({ id: 'urn:oid:1' }), '2026-04-12T16:00:00.000Z');
    expect(a).not.toBeNull();
    expect(a!.alertId).toBe('urn:oid:1');
    expect(a!.description).toContain('Typhoon Sinlaku (04W)');
    expect(a!.vtec).toBe('/O.NEW.PGUM.TY.W.4004.260412T0551Z-000000T0000Z/');
    expect(a!.severity).toBe('Extreme');
    expect(a!.summaryStatus).toBe('pending');
    expect(a!.receivedAt).toBe('2026-04-12T16:00:00.000Z');
    expect(a!.sourceUrl).toBe('https://api.weather.gov/alerts/urn:oid:1');
  });

  test('unknown severity maps to Unknown; missing event → null', () => {
    expect(normalizeFeature(feature({ id: 'a', severity: 'Weird' }), 'x')!.severity).toBe('Unknown');
    expect(normalizeFeature({ properties: { id: 'b' } }, 'x')).toBeNull();
  });

  test('mergeAlerts keeps existing receivedAt/summary and reports new ids', () => {
    const existing = [stored({ alertId: 'old', plainSummary: 'kept', summaryStatus: 'ok', receivedAt: '2026-04-10T00:00:00.000Z' })];
    const { alerts, newIds } = mergeAlerts(existing, [feature({ id: 'old' }), feature({ id: 'new' })], NOW);
    expect(newIds).toEqual(['new']);
    const old = alerts.find((a) => a.alertId === 'old')!;
    expect(old.plainSummary).toBe('kept');
    expect(old.receivedAt).toBe('2026-04-10T00:00:00.000Z');
    expect(alerts[0].alertId).toBe('new'); // newest-received first
  });

  test('pruneAlerts enforces 50 items / 90 days', () => {
    const many = Array.from({ length: 60 }, (_, i) => stored({ alertId: `a${i}`, receivedAt: new Date(NOW - i * HOUR).toISOString() }));
    expect(pruneAlerts(many, NOW)).toHaveLength(ALERT_RETENTION_MAX);
    const old = stored({ alertId: 'ancient', receivedAt: new Date(NOW - 91 * 24 * HOUR).toISOString() });
    expect(pruneAlerts([old], NOW)).toHaveLength(0);
  });

  test('VTEC parsing', () => {
    const v = parseVtec('/O.NEW.PGUM.TY.W.4004.260412T0551Z-000000T0000Z/');
    expect(v).toEqual({ action: 'NEW', office: 'PGUM', phenomenon: 'TY', significance: 'W', eventNumber: '4004', begin: '2026-04-12T05:51:00Z', end: null });
    expect(vtecIsEnded('/O.CAN.PGUM.TY.W.4004.000000T0000Z-000000T0000Z/')).toBe(true);
    expect(vtecIsEnded('/O.CON.PGUM.TY.W.4004.000000T0000Z-000000T0000Z/')).toBe(false);
    expect(parseVtec('garbage')).toBeNull();
  });

  test('typhoon-class detection and storm name extraction', () => {
    expect(isTyphoonClass('Typhoon Warning')).toBe(true);
    expect(isTyphoonClass('Tropical Storm Watch')).toBe(true);
    expect(isTyphoonClass('Flood Advisory')).toBe(false);
    expect(extractStormName({ event: 'Typhoon Warning', headline: null, description: 'As Typhoon Sinlaku (04W) moves closer' })).toBe('Typhoon Sinlaku');
    expect(extractStormName({ event: 'Typhoon Warning', headline: '...TYPHOON WARNING IN EFFECT...', description: 'STY Sinlaku' })).toBe('Super Typhoon Sinlaku');
    expect(extractStormName({ event: 'Typhoon Warning', headline: '...TYPHOON WARNING IN EFFECT...', description: 'the threat for sustained high winds' })).toBeNull();
    expect(extractStormName({ event: 'Typhoon Warning', headline: null, description: 'TYPHOON WARNING IN EFFECT. As Typhoon Sinlaku (04W) moves closer' })).toBe('Typhoon Sinlaku');
    expect(extractCategory({ headline: null, description: 'may cross as a category 3 or 4 Typhoon' })).toBe('Category 3');
  });

  test('isActive respects ends/expires and VTEC CAN', () => {
    expect(isActive(stored({ alertId: 'a', ends: new Date(NOW + HOUR).toISOString() }), NOW)).toBe(true);
    expect(isActive(stored({ alertId: 'b', expires: new Date(NOW - HOUR).toISOString() }), NOW)).toBe(false);
    expect(isActive(stored({ alertId: 'c', ends: new Date(NOW + HOUR).toISOString(), vtec: '/O.CAN.PGUM.TY.W.4004.000000T0000Z-000000T0000Z/' }), NOW)).toBe(false);
  });
});

describe('phase derivation (no AI)', () => {
  test('no alerts → none', () => {
    expect(derivePhase([], NOW).phase).toBe('none');
    expect(derivePhase([stored({ alertId: 'f', event: 'Flood Advisory', ends: new Date(NOW + HOUR).toISOString() })], NOW).phase).toBe('none');
  });

  test('active warning with future onset → before, countdown to onset', () => {
    const onset = NOW + 42 * HOUR;
    const p = derivePhase([stored({ alertId: 'w', onset: new Date(onset).toISOString(), ends: new Date(onset + 12 * HOUR).toISOString() })], NOW);
    expect(p.phase).toBe('before');
    expect(p.target).toBe(onset);
    expect(p.targetSource).toBe('nws-onset');
  });

  test('active warning with onset in the past → during', () => {
    const p = derivePhase([stored({ alertId: 'w', onset: new Date(NOW - HOUR).toISOString(), ends: new Date(NOW + 6 * HOUR).toISOString() })], NOW);
    expect(p.phase).toBe('during');
  });

  test('warning with onset == sent (real NWS behaviour) falls back to forecast onset', () => {
    const forecast: WindForecast = {
      v: 1,
      fetchedAt: NOW - HOUR,
      utcOffsetSeconds: 36000,
      grid: { lat: 15.15, lon: 145.73, elevationM: 230 },
      hourly: Array.from({ length: 72 }, (_, i) => ({ t: NOW + (i + 1) * HOUR, wind: 20, gust: i >= 30 ? 65 : 30, precip: 0 })),
      attribution: 'Weather data by Open-Meteo.com',
      attributionUrl: 'https://open-meteo.com/',
    };
    const a = stored({ alertId: 'w', onset: new Date(NOW - 2 * HOUR).toISOString(), effective: new Date(NOW - 2 * HOUR).toISOString(), expires: new Date(NOW + 8 * HOUR).toISOString() });
    // Direct: onset in the past → during. With a forecast saying damaging gusts start in 30h, a watch would use it:
    expect(derivePhase([a], NOW, forecast).phase).toBe('during');
    const watch = stored({ alertId: 'wa', event: 'Typhoon Watch', onset: null, expires: new Date(NOW + 48 * HOUR).toISOString() });
    const p = derivePhase([watch], NOW, forecast);
    expect(p.phase).toBe('before');
    expect(p.targetSource).toBe('open-meteo');
    expect(p.target).toBe(NOW + 30 * HOUR); // bucket 31 covers (30h,31h] → onset = start of bucket
    expect(estimateOnsetFromForecast(forecast, NOW)).toBe(NOW + 30 * HOUR);
    expect(estimateOnsetFromForecast({ ...forecast, fetchedAt: NOW - 30 * HOUR }, NOW)).toBeNull(); // too stale
  });

  test('cancelled warning within 72h → after; older → none', () => {
    const can = stored({
      alertId: 'c',
      severity: 'Minor',
      vtec: '/O.CAN.PGUM.TY.W.4004.000000T0000Z-000000T0000Z/',
      receivedAt: new Date(NOW - 20 * HOUR).toISOString(),
      ends: new Date(NOW - 20 * HOUR).toISOString(),
    });
    const p = derivePhase([can], NOW);
    expect(p.phase).toBe('after');
    expect(p.endedAt).toBe(NOW - 20 * HOUR);
    const old = { ...can, receivedAt: new Date(NOW - (AFTER_WINDOW_HOURS + 1) * HOUR).toISOString(), ends: new Date(NOW - (AFTER_WINDOW_HOURS + 1) * HOUR).toISOString() };
    expect(derivePhase([old], NOW).phase).toBe('none');
  });

  test('warning outranks watch when both active', () => {
    const watch = stored({ alertId: 'wa', event: 'Typhoon Watch', expires: new Date(NOW + 48 * HOUR).toISOString() });
    const warn = stored({ alertId: 'w', onset: new Date(NOW + 30 * HOUR).toISOString(), ends: new Date(NOW + 40 * HOUR).toISOString() });
    const p = derivePhase([watch, warn], NOW);
    expect(p.primary?.alertId).toBe('w');
    expect(p.phase).toBe('before');
  });
});
