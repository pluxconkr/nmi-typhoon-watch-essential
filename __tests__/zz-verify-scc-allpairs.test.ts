/* TEMPORARY verification file (zz-verify-scc-*): all-pairs shelter/store routes, old graph vs new graph. */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import { roadGraph } from '@/data/roads';
import type { IslandId } from '@/domain/geo';
import { decodeRoadGraph } from '@/domain/roads';
import { reachByRoad } from '@/domain/routing';

const BEFORE_DIR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/roads-before';
const DESTS = [
  ...(shelters.shelters as any[]).map((s) => ({ id: `shelter:${s.shelterId}`, name: s.name, lat: s.lat, lng: s.lng, island: s.island as IslandId })),
  ...(supplies.stores as any[]).map((s) => ({ id: `store:${s.id}`, name: s.name, lat: s.lat, lng: s.lng, island: s.island as IslandId })),
];

test('every shelter/store reaches every other on its island, with identical distance and time before and after', () => {
  const out: any = {};
  for (const isl of ['saipan', 'tinian', 'rota'] as IslandId[]) {
    const ga = roadGraph(isl);
    const gb = decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-${isl}.json`, 'utf8')), isl);
    const pts = DESTS.filter((d) => d.island === isl);
    let pairs = 0;
    let missingAfter = 0;
    let missingBefore = 0;
    let diffs = 0;
    let maxAbs = 0;
    for (const o of pts) {
      const ra = new Map(reachByRoad(ga, o, pts, 'drive').map((r) => [r.id, r]));
      const rb = new Map(reachByRoad(gb, o, pts, 'drive').map((r) => [r.id, r]));
      for (const t of pts) {
        pairs++;
        const a = ra.get(t.id);
        const b = rb.get(t.id);
        if (!a) missingAfter++;
        if (!b) missingBefore++;
        if (a && b) {
          const d = Math.abs(a.distanceM - b.distanceM);
          maxAbs = Math.max(maxAbs, d, Math.abs(a.durationS - b.durationS));
          if (d > 1e-6 || Math.abs(a.durationS - b.durationS) > 1e-9) diffs++;
        }
      }
    }
    out[isl] = { points: pts.length, pairs, missingAfter, missingBefore, diffs, maxAbs };
    expect(missingAfter).toBe(0);
    expect(diffs).toBe(0);
  }
  fs.writeFileSync('/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/verify-scc/ts-allpairs.json', JSON.stringify(out, null, 1));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out));
});
