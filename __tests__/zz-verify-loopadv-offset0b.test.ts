import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, snapToRoad } from '@/domain/roads';
import { planRoute, reachByRoad } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const saipanShelters = list.filter((s) => s.island === 'saipan');

test('start exactly on the junction node of a one-way loop', () => {
  const g = roadGraph('saipan');
  const out: string[] = [];
  for (const L of [1067, 3345]) {
    const N = g.edgeFrom[L];
    const from = { lat: g.nodeLat[N], lng: g.nodeLng[N] };
    const s = snapToRoad(g, from, 'drive')!;
    out.push(`loop e${L}: exact node ${JSON.stringify(from)} snaps to edge=${s.edge} offset=${s.offset} dist=${s.distM}`);
    for (const to of saipanShelters.slice(0, 6)) {
      const r = planRoute(g, from, to, to.name, 'drive');
      const reach = reachByRoad(g, from, [{ id: to.shelterId, name: to.name, lat: to.lat, lng: to.lng }], 'drive')[0];
      if (!r || !reach) { out.push(`  -> ${to.shelterId}: null route=${!!r} reach=${!!reach}`); continue; }
      out.push(
        `  -> ${to.shelterId}: route.distanceM=${r.distanceM.toFixed(1)} reach.distanceM=${reach.distanceM.toFixed(1)} diff=${(r.distanceM - reach.distanceM).toFixed(1)} dur(route)=${r.durationS.toFixed(1)} dur(reach)=${reach.durationS.toFixed(1)} legs0=${JSON.stringify(r.legs[0])} nlegs=${r.legs.length} step0=${r.steps[0].maneuver}/${r.steps[0].road}/${r.steps[0].heading}`,
      );
    }
  }
  console.log(out.join('\n'));
});
