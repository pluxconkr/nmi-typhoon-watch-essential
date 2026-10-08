import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('survey: epsilon first legs at node-coordinate fixes', () => {
  const g = roadGraph('saipan');
  const dests = [byId('kagman-high-school'), byId('marianas-high-school'), byId('tanapag-middle-school'), byId('koblerville-elementary-school')];
  const stats: Record<string, number> = {};
  const bad: any[] = [];
  const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
  for (let i = 0; i < g.nodeCount; i++) {
    const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
    for (const d of dests) {
      const r = planRoute(g, from, d, d.name, 'drive');
      if (!r) continue;
      inc('routes');
      const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
      const L0 = len(r.legs[0]);
      const trueLeg = r.legs.find((l) => len(l) >= 1) ?? r.legs[0];
      const trueRoad = edgeNameOf(g, trueLeg.edge);
      const departRoad = r.steps[0].road;
      const cat = L0 === 0 ? 'A exact-zero' : L0 < 1e-6 ? 'B epsilon' : L0 < 1 ? 'C <1m' : L0 < 15 ? 'D <15m' : 'E >=15m';
      inc(cat);
      const mismatch = departRoad !== trueRoad;
      if (mismatch) inc(cat + ' MISMATCH');
      const s1 = r.steps[1];
      const redundant = s1 && s1.maneuver === 'continue' && s1.startDist < 15;
      if (redundant) inc(cat + ' early-continue');
      if (mismatch && bad.length < 400) bad.push({ node: i, from, dest: d.shelterId, cat, L0, departRoad, trueRoad, s0: instructionFor(r.steps[0], d.name), s1: s1 ? instructionFor(s1, d.name) + ` @${s1.startDist}` : null });
    }
  }
  console.log('STATS', JSON.stringify(stats, null, 1));
  console.log('BAD sample', JSON.stringify(bad.filter((b) => b.cat.startsWith('B')).slice(0, 8), null, 1));
  console.log('BAD A sample', JSON.stringify(bad.filter((b) => b.cat.startsWith('A')).slice(0, 8), null, 1));
});
