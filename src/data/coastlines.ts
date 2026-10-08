/**
 * Bundled OSM coastlines (simplified rings of [lng, lat]) by island.
 */
import rota from '@/assets/data/rota-coastline.json';
import saipan from '@/assets/data/saipan-coastline.json';
import tinian from '@/assets/data/tinian-coastline.json';
import type { IslandId } from '@/domain/geo';

export const COASTLINES: Record<IslandId, [number, number][]> = {
  saipan: saipan.ring as [number, number][],
  tinian: tinian.ring as [number, number][],
  rota: rota.ring as [number, number][],
};
