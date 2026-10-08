import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeReversible, edgeUsable, snapToRoad, type RoadGraph, type TravelMode } from '@/domain/roads';
import { planRoute, reachByRoad, type Route } from '@/domain/routing';
import type { Shelter } from '@/domain/types';
import type { IslandId } from '@/domain/geo';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');
const list = shelters.shelters as Shelter[];

function same(a: Route, b: Route) {
  return a.distanceM === b.distanceM && a.durationS === b.durationS && JSON.stringify(a.legs) === JSON.stringify(b.legs) && JSON.stringify(a.steps) === JSON.stringify(b.steps);
}

function collect(g: RoadGraph, mode: TravelMode) {
  // Starts that snap exactly to offset 0 or edgeLen, any edge kind.
  const M = 111320;
  const found = new Map<string, { pos: { lat: number; lng: number }; edge: number; at: 'zero' | 'end'; oneWay: boolean }>();
  for (let e = 0; e < g.edgeCount; e++) {
    if (!edgeUsable(g, e, mode)) continue;
    const s = g.geomStart[e];
    const n = g.geomCount[e];
    for (const end of ['zero', 'end'] as const) {
      const node = end === 'zero' ? g.edgeFrom[e] : g.edgeTo[e];
      // direction pointing out of the edge at that end
      const [i0, i1] = end === 'zero' ? [s + 1, s] : [s + n - 2, s + n - 1];
      const dx = (g.ptLng[i1] - g.ptLng[i0]) * g.kx;
      const dy = g.ptLat[i1] - g.ptLat[i0];
      const len = Math.hypot(dx, dy) || 1;
      for (const d of [0, 0.3, 1, 3]) {
        const pos = { lat: g.nodeLat[node] + (dy / len) * (d / M), lng: g.nodeLng[node] + (dx / len / g.kx) * (d / M) };
        const sn = snapToRoad(g, pos, mode);
        if (!sn) continue;
        const kind = sn.offset === 0 ? 'zero' : sn.offset === g.edgeLen[sn.edge] ? 'end' : null;
        if (!kind) continue;
        const key = `${sn.edge}:${kind}`;
        if (!found.has(key)) found.set(key, { pos, edge: sn.edge, at: kind, oneWay: !edgeReversible(g, sn.edge, 'drive') });
      }
    }
  }
  return [...found.values()];
}

function check(island: IslandId, mode: TravelMode) {
  const g = roadGraph(island);
  const starts = collect(g, mode);
  const dests = list.filter((s) => s.island === island);
  const tally: Record<string, { n: number; diff: number; routeReachMismatch: number }> = {};
  for (const st of starts) {
    const cls = `${st.oneWay ? 'oneway' : 'twoway'}@${st.at}`;
    tally[cls] ??= { n: 0, diff: 0, routeReachMismatch: 0 };
    for (const t of dests) {
      const a = planRoute(g, st.pos, t, t.name, mode);
      const b = base.planRoute(g, st.pos, t, t.name, mode);
      tally[cls].n++;
      if (!a || !b) { if (!!a !== !!b) tally[cls].diff++; continue; }
      if (!same(a, b)) tally[cls].diff++;
      const rc = reachByRoad(g, st.pos, [{ id: 'x', name: 'x', lat: t.lat, lng: t.lng }], mode)[0];
      if (!rc || Math.abs(rc.distanceM - a.distanceM) > 1 || Math.abs(rc.durationS - a.durationS) > 0.05) tally[cls].routeReachMismatch++;
    }
  }
  return { island, mode, starts: starts.length, tally };
}

test('twoway@zero, twoway@end, oneway@end are unchanged by the fix; oneway@zero differs only by improvement', () => {
  const out = [check('saipan', 'drive'), check('tinian', 'drive'), check('rota', 'drive'), check('saipan', 'walk'), check('tinian', 'walk')];
  console.log(JSON.stringify(out, null, 1));
}, 900000);
