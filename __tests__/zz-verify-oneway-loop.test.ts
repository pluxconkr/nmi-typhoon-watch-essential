import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeReversible, snapToRoad, edgeSlice } from '@/domain/roads';
import { planRoute, reachByRoad, routeToNearest } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('one-way loop node starts', () => {
  const g = roadGraph('saipan');
  const k = byId('kagman-high-school');
  const out: string[] = [];
  for (const e of [1067, 3345]) {
    const n = g.edgeFrom[e];
    const pos = { lat: g.nodeLat[n], lng: g.nodeLng[n] };
    const sn = snapToRoad(g, pos, 'drive')!;
    out.push(`loop e${e} node ${n}: snap -> edge ${sn.edge} offset ${sn.offset} (len ${g.edgeLen[sn.edge].toFixed(2)}) distM ${sn.distM} oneWay=${!edgeReversible(g, sn.edge, 'drive')}`);
    const r = planRoute(g, pos, k, k.name, 'drive');
    const reach = reachByRoad(g, pos, [{ id: 'k', name: k.name, lat: k.lat, lng: k.lng }], 'drive')[0];
    out.push(`  planRoute dist=${r?.distanceM.toFixed(1)} dur=${r?.durationS.toFixed(1)} legs=${JSON.stringify(r?.legs.slice(0, 3))}`);
    out.push(`  reachByRoad dist=${reach?.distanceM.toFixed(1)} dur=${reach?.durationS.toFixed(1)}`);
    const near = routeToNearest(g, pos, [{ id: 'k', name: k.name, lat: k.lat, lng: k.lng }], 'drive');
    out.push(`  routeToNearest dist=${near?.route.distanceM.toFixed(1)} dur=${near?.route.durationS.toFixed(1)}`);
  }
  console.log(out.join('\n'));
});
