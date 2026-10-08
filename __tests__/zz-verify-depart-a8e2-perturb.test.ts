import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('perturb the fix used by the existing regression test', () => {
  const g = roadGraph('saipan');
  const ke = byId('kagman-elementary-school');
  const base = { lat: 15.136576, lng: 145.720368 };
  const sp = snapToRoad(g, base, 'drive', 500)!;
  console.log('base snap', JSON.stringify(sp), 'len', g.edgeLen[sp.edge], 'name', edgeNameOf(g, sp.edge), 'from/to', g.edgeFrom[sp.edge], g.edgeTo[sp.edge]);
  const r0 = planRoute(g, base, ke, ke.name, 'drive')!;
  console.log('base legs', JSON.stringify(r0.legs.slice(0, 3).map((l) => ({ ...l, name: edgeNameOf(g, l.edge), len: Math.abs(l.to - l.from) }))));
  console.log('base steps', r0.steps.slice(0, 3).map((s) => instructionFor(s, ke.name) + ' @' + s.startDist));
  // Perturb in a 9x9 grid of 1 mm steps.
  const out: Record<string, number> = {};
  const samples: any[] = [];
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const p = { lat: base.lat + i * 1e-8, lng: base.lng + j * 1e-8 };
      const r = planRoute(g, p, ke, ke.name, 'drive')!;
      const L0 = Math.abs(r.legs[0].to - r.legs[0].from);
      const key = `${L0 === 0 ? 'zero' : L0 < 1e-6 ? 'eps' : L0 < 1 ? '<1m' : '>=1m'} -> ${r.steps[0].road} | step1=${r.steps[1].maneuver}:${r.steps[1].road}@${r.steps[1].startDist.toFixed(1)}`;
      out[key] = (out[key] ?? 0) + 1;
      if (L0 > 0 && L0 < 1e-6 && samples.length < 3) samples.push({ p, L0, text: instructionFor(r.steps[0], ke.name), next: instructionFor(r.steps[1], ke.name) + ' @' + r.steps[1].startDist });
    }
  }
  console.log(JSON.stringify(out, null, 1));
  console.log(JSON.stringify(samples, null, 1));
});
