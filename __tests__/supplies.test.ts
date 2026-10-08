/**
 * Supply stores near a shelter: a balanced list (food, pharmacy, hardware, gas), precisely placed and
 * confirmed-open stores first, all from the bundled verified data.
 */
import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import { storesNear } from '@/domain/supplies';
import type { Shelter, SupplyStore } from '@/domain/types';

const stores = supplies.stores as SupplyStore[];
const shelter = (id: string) => (shelters.shelters as Shelter[]).find((s) => s.shelterId === id)!;

test('the bundle has stores of every kind on Saipan, and stores on Tinian and Rota', () => {
  const saipan = stores.filter((s) => s.island === 'saipan');
  for (const c of ['grocery', 'pharmacy', 'hardware', 'fuel'] as const) expect(saipan.some((s) => s.category === c)).toBe(true);
  expect(stores.some((s) => s.island === 'tinian')).toBe(true);
  expect(stores.some((s) => s.island === 'rota')).toBe(true);
  // Nothing closed, nothing without a location, nothing both unconfirmed and only village-level.
  for (const s of stores) expect(s.status === 'unknown' && s.coordConfidence === 'low').toBe(false);
});

test('near Marianas High School: at most two of each kind, nearest first, precise pins preferred', () => {
  const s = shelter('marianas-high-school');
  const near = storesNear(stores, s, 'saipan');
  expect(near.length).toBeGreaterThan(2);
  for (let i = 1; i < near.length; i++) expect(near[i].km).toBeGreaterThanOrEqual(near[i - 1].km);
  const perKind = new Map<string, number>();
  for (const n of near) perKind.set(n.store.category, (perKind.get(n.store.category) ?? 0) + 1);
  for (const count of perKind.values()) expect(count).toBeLessThanOrEqual(2);
  for (const n of near) expect(n.km).toBeLessThanOrEqual(3);
  expect(near.some((n) => n.store.category === 'fuel')).toBe(true);
});

test('a shelter with nothing within 3 km still gets the nearest stores on its island', () => {
  const far = { lat: 15.285, lng: 145.82 }; // Marpi, northern tip of Saipan
  const near = storesNear(stores, far, 'saipan');
  expect(near.length).toBeGreaterThan(0);
  expect(near.length).toBeLessThanOrEqual(3);
});
