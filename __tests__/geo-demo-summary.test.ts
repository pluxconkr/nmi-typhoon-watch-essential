import saipan from '@/assets/data/saipan-coastline.json';
import { validateSummary } from '@/app/api/summarize+api';
import { SAIPAN_BBOX, bearingDeg, compassLabel, formatDistance, haversineKm, makeProjection, ringToPath } from '@/domain/geo';
import { derivePhase } from '@/domain/phase';
import { buildDemoAlerts, DEMO_BEFORE_OFFSET_MS } from '@/services/demo';

describe('geo', () => {
  const garapan = { lat: 15.207085, lng: 145.720861 };
  const kagman = { lat: 15.172391, lng: 145.77538 };

  test('haversine Garapan → Kagman ≈ 7 km', () => {
    const km = haversineKm(garapan, kagman);
    expect(km).toBeGreaterThan(6.5);
    expect(km).toBeLessThan(7.5);
    expect(haversineKm(garapan, garapan)).toBe(0);
  });

  test('formatDistance', () => {
    expect(formatDistance(0.85)).toBe('850 m');
    expect(formatDistance(1.234)).toBe('1.2 km');
    expect(formatDistance(12.6)).toBe('13 km');
    expect(formatDistance(NaN)).toBe('—');
  });

  test('projection keeps every coastline vertex inside the canvas and preserves orientation', () => {
    const proj = makeProjection(SAIPAN_BBOX, 300, 400, 8);
    const ring = saipan.ring as [number, number][];
    for (const [lng, lat] of ring) {
      const { x, y } = proj.toXY({ lat, lng });
      expect(x).toBeGreaterThanOrEqual(8);
      expect(x).toBeLessThanOrEqual(292);
      expect(y).toBeGreaterThanOrEqual(8);
      expect(y).toBeLessThanOrEqual(392);
    }
    // North is up: Marpi (north) has a smaller y than Koblerville (south).
    expect(proj.toXY({ lat: 15.27, lng: 145.80 }).y).toBeLessThan(proj.toXY({ lat: 15.12, lng: 145.70 }).y);
    const d = ringToPath(ring, proj);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(ring.length).toBe(400);
  });

  test('bearing / compass', () => {
    expect(compassLabel(bearingDeg(garapan, { lat: 15.3, lng: 145.720861 }))).toBe('N');
    expect(compassLabel(bearingDeg(garapan, kagman))).toBe('SE');
  });
});

describe('demo scenarios drive the phase machine', () => {
  const now = Date.parse('2026-09-16T08:00:00+10:00');

  test('before → countdown of 42h10m to onset', () => {
    const alerts = buildDemoAlerts('before', now);
    expect(alerts.every((a) => a.isDemo)).toBe(true);
    const p = derivePhase(alerts, now);
    expect(p.phase).toBe('before');
    expect(p.target).toBe(now + DEMO_BEFORE_OFFSET_MS);
  });

  test('during → during; after → after; calm/live → none', () => {
    expect(derivePhase(buildDemoAlerts('during', now), now).phase).toBe('during');
    expect(derivePhase(buildDemoAlerts('after', now), now).phase).toBe('after');
    expect(buildDemoAlerts('calm', now)).toEqual([]);
    expect(buildDemoAlerts('live', now)).toEqual([]);
  });

  test('demo text is the real NWS Tiyan GU product text', () => {
    const [w] = buildDemoAlerts('before', now);
    expect(w.description).toContain('Typhoon Sinlaku (04W)');
    expect(w.vtec).toBe('/O.NEW.PGUM.TY.W.4004.260412T0551Z-000000T0000Z/');
    expect(w.senderName).toBe('NWS Tiyan GU');
  });
});

describe('summary validation (server-side guard rails)', () => {
  const source = 'Typhoon force winds of 74 mph or greater are expected Tuesday morning. Rainfall of 15 to 20 inches.';

  test('accepts a short sentence whose numbers exist in the source', () => {
    expect(validateSummary('Winds over 74 mph arrive Tuesday morning.', source)).toEqual({ ok: true, summary: 'Winds over 74 mph arrive Tuesday morning.' });
  });

  test('rejects invented numbers, long output and empty output', () => {
    expect(validateSummary('Winds of 100 mph arrive Tuesday.', source)).toMatchObject({ ok: false, reason: 'number-not-in-source:100' });
    expect(validateSummary('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen', source)).toMatchObject({ ok: false, reason: 'too-long' });
    expect(validateSummary('   ', source)).toMatchObject({ ok: false, reason: 'empty' });
    expect(validateSummary('Stay inside. Winds are coming.', source)).toMatchObject({ ok: false, reason: 'multi-sentence' });
  });
});
