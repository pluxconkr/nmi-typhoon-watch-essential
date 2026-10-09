import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, snapToRoad } from '@/domain/roads';
import { planRoute, reachByRoad, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

test('loops (from === to): start exactly at the loop node', () => {
  const rows: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const d = list.filter((s) => s.island === island)[0];
    let loops = 0, oneWay = 0, incons = 0;
    const ex: any[] = [];
    for (let e = 0; e < g.edgeCount; e++) {
      if (g.edgeFrom[e] !== g.edgeTo[e]) continue;
      loops++;
      for (const mode of ['drive', 'walk'] as const) {
        if (mode === 'drive' && edgeReversible(g, e, 'drive')) { /* two-way loop */ } else if (mode === 'drive') oneWay++;
        const n = g.edgeFrom[e];
        const p = { lat: g.nodeLat[n], lng: g.nodeLng[n] };
        const r = planRoute(g, p, d, d.name, mode);
        const sp = snapToRoad(g, p, mode, 500)!;
        const reach = reachByRoad(g, p, [{ id: 'x', name: d.name, lat: d.lat, lng: d.lng }], mode)[0];
        if (r && reach && Math.abs(r.distanceM - reach.distanceM) > 1) {
          incons++;
          if (ex.length < 3) ex.push({ edge: e, mode, snapEdge: sp.edge, snapOffset: sp.offset, loopLen: g.edgeLen[e], routeDist: r.distanceM, reachDist: reach.distanceM, firstLeg: Math.abs(r.legs[0].to - r.legs[0].from), depart: instructionFor(r.steps[0], d.name) });
        }
      }
    }
    rows.push(`${island}: loopEdges=${loops} oneWayLoopsDrive=${oneWay} routeVsSearchDistanceMismatch=${incons} ${JSON.stringify(ex)}`);
  }
  console.log(rows.join('\n'));
});
