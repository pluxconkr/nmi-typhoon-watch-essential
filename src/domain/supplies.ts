/**
 * Supply stores near a point (a shelter, or you). Pure functions over the bundled list.
 */
import { haversineKm, type LatLng } from './geo';
import type { Island, SupplyCategory, SupplyStore } from './types';

export const SUPPLY_LABEL: Record<SupplyCategory, string> = {
  grocery: 'Grocery',
  convenience: 'Convenience store',
  pharmacy: 'Pharmacy',
  hardware: 'Hardware',
  fuel: 'Gas station',
};

/** Order used when listing categories. */
export const SUPPLY_CATEGORIES: SupplyCategory[] = ['grocery', 'pharmacy', 'hardware', 'fuel', 'convenience'];

export interface NearbyStore {
  store: SupplyStore;
  km: number;
}

/** Precisely placed, confirmed-open stores first; village-level pins and unconfirmed stores after. */
const rank = (s: SupplyStore) => (s.coordConfidence === 'low' ? 2 : 0) + (s.status === 'unknown' ? 1 : 0);

/**
 * A balanced "what can I buy near here" list: up to `perCategory` stores of each kind (grocery, pharmacy,
 * hardware, gas, convenience) within `radiusKm` of `point` on `island` — precisely placed and confirmed-open
 * stores first — then sorted by distance. If nothing is that close, the nearest `fallback` stores on the island.
 */
export function storesNear(stores: SupplyStore[], point: LatLng, island: Island, radiusKm = 3, perCategory = 2, fallback = 3): NearbyStore[] {
  const onIsland = stores.filter((s) => s.island === island).map((store) => ({ store, km: haversineKm(point, store) }));
  const near = onIsland.filter((x) => x.km <= radiusKm);
  if (!near.length) return onIsland.sort((a, b) => a.km - b.km).slice(0, fallback);
  const picked: NearbyStore[] = [];
  for (const category of SUPPLY_CATEGORIES) {
    const ofKind = near.filter((x) => x.store.category === category).sort((a, b) => rank(a.store) - rank(b.store) || a.km - b.km);
    picked.push(...ofKind.slice(0, perCategory));
  }
  return picked.sort((a, b) => a.km - b.km);
}
