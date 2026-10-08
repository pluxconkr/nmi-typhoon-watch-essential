/**
 * Demo positions: labelled stand-ins for GPS so directions can be shown away from the islands
 * (judges, the submission video). Coordinates come from the bundled village points.
 */
import type { IslandId } from './geo';
import type { DemoPositionId, LocationFix } from './types';
import { VILLAGES } from './places';

// Village names repeat across islands (San Jose is on Saipan and Tinian), so the island is part of the key.
const VILLAGE_FOR: Record<DemoPositionId, { village: string; island: IslandId; label: string }> = {
  garapan: { village: 'Garapan', island: 'saipan', label: 'Garapan, Saipan' },
  koblerville: { village: 'Koblerville', island: 'saipan', label: 'Koblerville, Saipan' },
  kagman: { village: 'Kagman', island: 'saipan', label: 'Kagman, Saipan' },
  'san-jose-tinian': { village: 'San Jose', island: 'tinian', label: 'San Jose, Tinian' },
  'songsong-rota': { village: 'Songsong', island: 'rota', label: 'Songsong, Rota' },
};

export const DEMO_POSITION_IDS = Object.keys(VILLAGE_FOR) as DemoPositionId[];

export function demoPositionLabel(id: DemoPositionId): string {
  return VILLAGE_FOR[id].label;
}

/** The fix a demo position stands for, or null if the village point is missing. */
export function demoPositionFix(id: DemoPositionId, now: number = Date.now()): LocationFix | null {
  const { village, island } = VILLAGE_FOR[id];
  const v = VILLAGES.find((x) => x.name === village && x.island === island);
  if (!v) return null;
  return { lat: v.lat, lng: v.lng, accuracyM: 5, at: now, heading: null, speed: null, demo: id };
}
