import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

test('exact-zero vs epsilon first legs, per island and mode (one destination each, all nodes)', () => {
  const rows: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dest = list.filter((s) => s.island === island)[0];
    for (const mode of ['drive', 'walk'] as const) {
      let zero = 0, zeroBad = 0, eps = 0, epsBad = 0, epsSpurious = 0, routes = 0;
      const badEx: any[] = [];
      for (let i = 0; i < g.nodeCount; i++) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        const r = planRoute(g, from, dest, dest.name, mode);
        if (!r) continue;
        routes++;
        const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
        const L0 = len(r.legs[0]);
        const trueLeg = r.legs.find((l) => len(l) >= 1) ?? r.legs[0];
        const trueRoad = edgeNameOf(g, trueLeg.edge);
        const bad = r.steps[0].road !== trueRoad;
        if (L0 === 0) { zero++; if (bad) zeroBad++; }
        else if (L0 < 1e-6) {
          eps++;
          if (bad) { epsBad++; if (badEx.length < 2) badEx.push({ i, from, text: instructionFor(r.steps[0], dest.name), trueRoad, next: instructionFor(r.steps[1], dest.name) + '@' + r.steps[1].startDist.toFixed(1) }); }
          if (r.steps[1] && r.steps[1].startDist < 1e-3 && r.steps[1].maneuver !== 'arrive') epsSpurious++;
        }
      }
      rows.push(`${island} ${mode}: routes=${routes} exactZero=${zero} (wrong depart road: ${zeroBad}) epsilon=${eps} (wrong depart road: ${epsBad}; spurious step within 1mm of start: ${epsSpurious}) ${JSON.stringify(badEx)}`);
    }
  }
  console.log(rows.join('\n'));
});
