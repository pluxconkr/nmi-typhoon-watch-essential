/* TEMPORARY verification file (zz-verify-scc-*): NavSession end to end next to the six removed edges. */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { decodeRoadGraph, type RoadGraph } from '@/domain/roads';
import type { IslandId } from '@/domain/geo';
import { NavSession } from '@/services/navigation';

const BEFORE_DIR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/roads-before';
const old: Record<string, RoadGraph> = { saipan: decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-saipan.json`, 'utf8')), 'saipan') };
const places = (shelters.shelters as any[]).filter((s) => s.island === 'saipan').map((s) => ({ id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng, island: 'saipan' as IslandId }));
const POINTS = [
  { lat: 15.16819, lng: 145.71465 },
  { lat: 15.12292, lng: 145.72291 },
  { lat: 15.16816, lng: 145.71497 },
  { lat: 15.2107, lng: 145.72477 },
  { lat: 15.168, lng: 145.71435 },
  { lat: 15.12283, lng: 145.72294 },
  { lat: 15.21131, lng: 145.72498 },
];

test('NavSession status next to the dead ends, old vs new graph', () => {
  const rows: string[] = [];
  for (const p of POINTS) {
    for (const mode of ['drive', 'walk'] as const) {
      const sNew = new NavSession({ kind: 'nearest', places, label: 'shelter' }, mode, (i) => roadGraph(i), Date.now());
      const sOld = new NavSession({ kind: 'nearest', places, label: 'shelter' }, mode, (i) => old[i] ?? roadGraph(i), Date.now());
      sNew.update({ ...p, accuracyM: 5, at: Date.now() });
      sOld.update({ ...p, accuracyM: 5, at: Date.now() });
      const a = sNew.getSnapshot();
      const b = sOld.getSnapshot();
      rows.push(`${mode} ${p.lat},${p.lng}: old=${b.status}${b.route ? ' ' + Math.round(b.route.distanceM) + 'm->' + b.target?.id : ''} | new=${a.status}${a.route ? ' ' + Math.round(a.route.distanceM) + 'm->' + a.target?.id : ''}`);
      expect(a.status).toBe('navigating');
    }
  }
  // eslint-disable-next-line no-console
  console.log(rows.join('\n'));
});
