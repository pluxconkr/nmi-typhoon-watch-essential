/**
 * Bundled road graphs (scripts/build-roads.py), decoded on first use per island and kept in memory.
 */
import rota from '@/assets/data/roads-rota.json';
import saipan from '@/assets/data/roads-saipan.json';
import tinian from '@/assets/data/roads-tinian.json';
import type { IslandId } from '@/domain/geo';
import { decodeRoadGraph, type RoadGraph, type RoadGraphData } from '@/domain/roads';

const DATA: Record<IslandId, RoadGraphData> = { saipan, tinian, rota };
const cache = new Map<IslandId, RoadGraph>();

export function roadGraph(island: IslandId): RoadGraph {
  let g = cache.get(island);
  if (!g) {
    g = decodeRoadGraph(DATA[island], island);
    cache.set(island, g);
  }
  return g;
}
