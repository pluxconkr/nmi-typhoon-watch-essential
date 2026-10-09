/* TEMPORARY verification file (zz-verify-scc-*): reproduce the original bug on the old graph, confirm the fix on the new. */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { decodeRoadGraph, snapToRoad } from '@/domain/roads';
import { planRoute, routeToNearest } from '@/domain/routing';

const BEFORE_DIR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/roads-before';
const old = decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-saipan.json`, 'utf8')), 'saipan');
const neu = roadGraph('saipan');
const list = shelters.shelters as any[];
const k = list.find((s) => s.shelterId === 'kagman-high-school');

test('old graph: positions near one-way dead ends fail; new graph: they route', () => {
  const rows: string[] = [];
  const pts = [
    { lat: 15.16819, lng: 145.71465 },
    { lat: 15.12292, lng: 145.72291 },
    { lat: 15.16816, lng: 145.71497 },
    { lat: 15.2107, lng: 145.72477 },
    { lat: 15.168, lng: 145.71435 }, // tip of the dead end
    { lat: 15.12284, lng: 145.72299 }, // source end of the pass-through driveway
    { lat: 15.12283, lng: 145.72294 }, // sink end
    { lat: 15.21141, lng: 145.72488 },
  ];
  for (const p of pts) {
    const so = snapToRoad(old, p, 'drive');
    const sn = snapToRoad(neu, p, 'drive');
    const ro = planRoute(old, p, k, k.name, 'drive');
    const rn = planRoute(neu, p, k, k.name, 'drive');
    const near = routeToNearest(neu, p, list.filter((s) => s.island === 'saipan').map((s) => ({ id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng })), 'drive');
    rows.push(`${p.lat},${p.lng}: old snap e${so?.edge} d=${so?.distM.toFixed(1)} route=${ro ? Math.round(ro.distanceM) : 'NULL'} | new snap e${sn?.edge} d=${sn?.distM.toFixed(1)} route=${rn ? Math.round(rn.distanceM) : 'NULL'} nearest=${near?.target.id}`);
    expect(rn).not.toBeNull();
    expect(near).not.toBeNull();
  }
  // eslint-disable-next-line no-console
  console.log(rows.join('\n'));
});
