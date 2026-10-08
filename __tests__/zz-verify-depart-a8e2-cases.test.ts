import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

function dump(label: string, island: 'saipan' | 'tinian' | 'rota', node: number, mode: 'drive' | 'walk', destIdx: number) {
  const g = roadGraph(island);
  const dests = list.filter((s) => s.island === island).slice(0, 3);
  const d = dests[destIdx];
  const from = { lat: g.nodeLat[node], lng: g.nodeLng[node] };
  const sp = snapToRoad(g, from, mode, 500)!;
  const r = planRoute(g, from, d, d.name, mode)!;
  console.log(
    label,
    JSON.stringify({ from, dest: d.shelterId, mode, snap: { edge: sp.edge, offset: sp.offset, len: g.edgeLen[sp.edge], name: edgeNameOf(g, sp.edge) } }),
    '\nlegs',
    JSON.stringify(r.legs.slice(0, 4).map((l) => ({ ...l, name: edgeNameOf(g, l.edge), len: +Math.abs(l.to - l.from).toFixed(2) }))),
    '\nsteps',
    JSON.stringify(r.steps.slice(0, 4).map((s) => `${instructionFor(s, d.name)} @${s.startDist.toFixed(1)} [${s.maneuver}/${s.side}/${s.stayOn}]`), null, 1),
    '\nOLD-style depart road would be:',
    edgeNameOf(g, r.legs[0].edge),
  );
}

test('dump cases', () => {
  for (let di = 0; di < 3; di++) dump('442 drive d' + di, 'saipan', 442, 'drive', di);
  for (let di = 0; di < 3; di++) dump('782 walk d' + di, 'saipan', 782, 'walk', di);
  for (let di = 0; di < 3; di++) dump('348 drive d' + di, 'saipan', 348, 'drive', di);
});
