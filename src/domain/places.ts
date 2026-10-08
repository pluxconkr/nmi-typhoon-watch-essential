/**
 * Village lookup for a position: "Garapan, Saipan". Bundled OSM/GeoNames village points, no network.
 */
import saipanVillages from '@/assets/data/saipan-villages.json';
import otherVillages from '@/assets/data/tinian-rota-villages.json';

import { ISLAND_NAME, haversineKm, islandAt, type IslandId, type LatLng } from './geo';

export interface Village {
  name: string;
  island: IslandId;
  lat: number;
  lng: number;
}

export const VILLAGES: Village[] = [
  ...saipanVillages.villages.map((v) => ({ name: v.name, island: 'saipan' as const, lat: v.lat, lng: v.lng })),
  ...otherVillages.villages.map((v) => ({ name: v.name, island: v.island as IslandId, lat: v.lat, lng: v.lng })),
];

/** A village counts as "near" within this distance; further out only the island is named. */
const NEAR_KM = 3;

export interface PlaceLabel {
  island: IslandId;
  village: string | null;
  /** "Garapan, Saipan" or "Saipan". */
  label: string;
}

/** Where a position is, in words. Null when it is not on Saipan, Tinian or Rota. */
export function describePosition(p: LatLng): PlaceLabel | null {
  const island = islandAt(p);
  if (!island) return null;
  let best: Village | null = null;
  let bestKm = Infinity;
  for (const v of VILLAGES) {
    if (v.island !== island) continue;
    const d = haversineKm(p, v);
    if (d < bestKm) {
      bestKm = d;
      best = v;
    }
  }
  const village = best && bestKm <= NEAR_KM ? best.name : null;
  return { island, village, label: village ? `${village}, ${ISLAND_NAME[island]}` : ISLAND_NAME[island] };
}
