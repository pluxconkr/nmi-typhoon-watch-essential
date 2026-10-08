import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('GPS-like fixes a few metres off the road whose nearest road point is a junction', () => {
  const g = roadGraph('saipan');
  const k = byId('kagman-high-school');
  const stats: Record<string, number> = {};
  const inc = (x: string) => (stats[x] = (stats[x] ?? 0) + 1);
  const found: any[] = [];
  const M = 111320;
  for (let n = 0; n < g.nodeCount; n += 3) {
    for (const rad of [3, 6]) {
      for (let a = 0; a < 360; a += 45) {
        const lat = Math.round((g.nodeLat[n] + (rad * Math.cos((a * Math.PI) / 180)) / M) * 1e6) / 1e6;
        const lng = Math.round((g.nodeLng[n] + (rad * Math.sin((a * Math.PI) / 180)) / (M * g.kx)) * 1e6) / 1e6;
        const sp = snapToRoad(g, { lat, lng }, 'drive', 500);
        if (!sp) continue;
        const len = g.edgeLen[sp.edge];
        const atEnd = sp.offset === 0 || len - sp.offset < 1e-6;
        if (!atEnd || sp.distM < 1) continue;
        const kind = sp.offset === 0 ? 'from-end exact' : len - sp.offset === 0 ? 'to-end exact' : 'to-end residue';
        inc('snapped-to-vertex ' + kind);
        const r = planRoute(g, { lat, lng }, k, k.name, 'drive')!;
        const L0 = Math.abs(r.legs[0].to - r.legs[0].from);
        const trueLeg = r.legs.find((l) => Math.abs(l.to - l.from) >= 1) ?? r.legs[0];
        const trueRoad = edgeNameOf(g, trueLeg.edge);
        const bucket = L0 === 0 ? 'first-leg zero' : L0 < 1e-6 ? 'first-leg EPS' : 'first-leg real';
        inc(`${kind} / ${bucket}`);
        if (r.steps[0].road !== trueRoad) {
          inc(`${kind} / ${bucket} / depart road WRONG`);
          if (found.length < 40) found.push({ fix: { lat, lng }, kind, L0, snapDist: sp.distM, departText: instructionFor(r.steps[0], k.name), trueRoad, next: instructionFor(r.steps[1], k.name) + ' @' + r.steps[1].startDist.toFixed(1) });
        }
      }
    }
  }
  console.log(JSON.stringify(stats, null, 1));
  console.log(JSON.stringify(found.slice(0, 12), null, 1));
});
