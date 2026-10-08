/**
 * Integrity of the data that ships inside the app — the offline safety net.
 */
import demo from '@/assets/data/demo-alerts.json';
import faq from '@/assets/data/faq.json';
import rota from '@/assets/data/rota-coastline.json';
import saipan from '@/assets/data/saipan-coastline.json';
import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import villages from '@/assets/data/saipan-villages.json';
import tinian from '@/assets/data/tinian-coastline.json';
import otherVillages from '@/assets/data/tinian-rota-villages.json';
import water from '@/assets/data/water-points.json';
import { ISLAND_BBOX, SAIPAN_BBOX, islandAt } from '@/domain/geo';
import type { FaqEntry, Shelter, SupplyStore, WaterPoint } from '@/domain/types';

const inBox = (lat: number, lng: number, box: { minLat: number; maxLat: number; minLng: number; maxLng: number }) =>
  lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;

describe('bundled shelters', () => {
  const list = shelters.shelters as Shelter[];

  test('has Saipan, Tinian and Rota entries with unique ids and every required field', () => {
    expect(list.length).toBeGreaterThanOrEqual(12);
    expect(new Set(list.map((s) => s.shelterId)).size).toBe(list.length);
    expect(list.some((s) => s.island === 'tinian')).toBe(true);
    expect(list.some((s) => s.island === 'rota')).toBe(true);
    for (const s of list) {
      expect(s.name.length).toBeGreaterThan(3);
      expect(s.village.length).toBeGreaterThan(1);
      expect(s.landmarkHint.length).toBeGreaterThan(10);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(s.lastVerified)).toBe(true);
      expect(s.verifiedBy.length).toBeGreaterThan(3);
      expect(['high', 'medium', 'low']).toContain(s.coordConfidence);
    }
  });

  test('the three HSEM primary Saipan shelters are present', () => {
    const ids = list.map((s) => s.shelterId);
    expect(ids).toEqual(expect.arrayContaining(['marianas-high-school', 'koblerville-elementary-school', 'kagman-high-school']));
  });

  test('every pin falls inside the bounding box of the island it claims', () => {
    for (const s of list) {
      expect(inBox(s.lat, s.lng, SAIPAN_BBOX)).toBe(s.island === 'saipan');
      expect(islandAt(s)).toBe(s.island);
    }
  });

  test('re-verified 7 Oct 2026: 10 on the latest list (Bavi), 7 from earlier storms, 4 named for medical support', () => {
    expect(list.filter((s) => s.designation === 'current')).toHaveLength(10);
    expect(list.filter((s) => s.designation === 'past')).toHaveLength(7);
    const medical = list.filter((s) => s.medicalSupport);
    expect(medical.map((s) => s.shelterId).sort()).toEqual(['dr-rita-hocog-inos-jr-sr-high-school', 'kagman-community-center', 'rota-office-on-aging-sinapalo', 'tinian-middle-high-school']);
    for (const s of medical) expect(s.designation).toBe('current');
    // HSEM primaries are current.
    for (const id of ['marianas-high-school', 'koblerville-elementary-school', 'kagman-high-school', 'tinian-elementary-school', 'rota-office-on-aging-sinapalo']) {
      expect(list.find((s) => s.shelterId === id)!.designation).toBe('current');
    }
    // The storm-damaged Man'amko' Center is flagged and never "current".
    const ooa = list.find((s) => s.shelterId === 'saipan-office-on-aging')!;
    expect(ooa.designation).toBe('past');
    expect(ooa.caution).toMatch(/roof and windows/);
    // Rota high school pin corrected away from the DLNR building (old pin 14.13504,145.13593).
    const rhi = list.find((s) => s.shelterId === 'dr-rita-hocog-inos-jr-sr-high-school')!;
    expect(Math.abs(rhi.lat - 14.14064)).toBeLessThan(1e-4);
    expect(Math.abs(rhi.lng - 145.14517)).toBeLessThan(1e-4);
    expect(rhi.landmarkHint).toMatch(/NOT the old Rota High School/);
    for (const s of list) expect(s.lastVerified).toBe('2026-10-07');
  });

  test('no shelter claims to accept pets (CNMI policy: certified service animals only)', () => {
    expect(list.every((s) => s.petsAllowed === false)).toBe(true);
  });

  test('phones, when present, are dialable', () => {
    for (const s of list) if (s.phone) expect(/^\(?\d{3}\)?[ -]?\d{3}-\d{4}$|^\+1\d{10}$/.test(s.phone)).toBe(true);
  });
});

describe('bundled water points, FAQ, geodata, demo alerts', () => {
  test('water points are 2026 entries on Saipan with hours and a date', () => {
    const pts = water.points as WaterPoint[];
    expect(pts.length).toBeGreaterThan(5);
    expect(new Set(pts.map((p) => p.id)).size).toBe(pts.length);
    for (const p of pts) {
      expect(p.lastVerified >= '2026-01-01').toBe(true);
      expect(p.hours.length).toBeGreaterThan(3);
      if (p.lat !== null && p.lng !== null) expect(inBox(p.lat, p.lng, SAIPAN_BBOX)).toBe(true);
    }
    expect(water.lastVerified >= '2026-01-01').toBe(true);
  });

  test('FAQ has exactly six during-storm situations, each with a source', () => {
    const entries = faq.entries as FaqEntry[];
    expect(entries.filter((e) => e.section === 'during')).toHaveLength(6);
    for (const e of entries) {
      expect(e.body.length).toBeGreaterThan(60);
      expect(e.source.length).toBeGreaterThan(2);
    }
  });

  test('each island coastline sits inside its bbox and is attributed to OSM', () => {
    const coasts = { saipan: [saipan, 400], tinian: [tinian, 200], rota: [rota, 199] } as const;
    for (const [id, [coast, verts]] of Object.entries(coasts)) {
      const ring = coast.ring as [number, number][];
      expect(ring.length).toBe(verts);
      for (const [lng, lat] of ring) expect(inBox(lat, lng, ISLAND_BBOX[id as keyof typeof ISLAND_BBOX])).toBe(true);
      expect(coast.attribution).toMatch(/OpenStreetMap/);
    }
    expect(villages.villages.length).toBe(26);
    expect(otherVillages.villages).toHaveLength(4);
    for (const v of otherVillages.villages) expect(islandAt(v)).toBe(v.island);
  });

  test('demo alerts are real NWS Tiyan GU products for Sinlaku', () => {
    expect(demo.alerts.map((a) => a.key)).toEqual(['warning-new', 'warning-passage', 'extreme-wind', 'warning-cancelled']);
    for (const a of demo.alerts) {
      expect(a.product_id).toMatch(/PGUM/);
      expect(a.description).toMatch(/Sinlaku/i);
    }
  });
});

describe('bundled supply stores', () => {
  const stores = supplies.stores as SupplyStore[];

  test('every store is on the island it claims, cites a source and was checked on a real date', () => {
    const ids = new Set<string>();
    for (const st of stores) {
      expect(ids.has(st.id)).toBe(false);
      ids.add(st.id);
      expect(['grocery', 'convenience', 'pharmacy', 'hardware', 'fuel']).toContain(st.category);
      expect(['operating', 'unknown']).toContain(st.status);
      expect(['high', 'medium', 'low']).toContain(st.coordConfidence);
      expect(islandAt(st)).toBe(st.island);
      expect(st.sources.length).toBeGreaterThan(0);
      for (const src of st.sources) expect(src.url).toMatch(/^https?:\/\//);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(st.lastVerified)).toBe(true);
      expect(st.statusEvidence.length).toBeGreaterThan(10);
    }
  });
});
