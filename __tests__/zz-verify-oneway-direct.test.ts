import { roadGraph } from '@/data/roads';
import { edgeReversible, edgeSlice, snapToRoad } from '@/domain/roads';
import { planRoute, reachByRoad, routeToNearest, trackRoute } from '@/domain/routing';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');

test('loop e1067: destination on the same loop (direct vs from tie)', () => {
  const g = roadGraph('saipan');
  const e = 1067;
  const n = g.edgeFrom[e];
  const start = { lat: g.nodeLat[n], lng: g.nodeLng[n] };
  const out: string[] = [];
  for (const frac of [0.1, 0.5, 0.9]) {
    const off = g.edgeLen[e] * frac;
    const [lat, lng] = edgeSlice(g, e, off, off)[0];
    const end = snapToRoad(g, { lat, lng }, 'drive')!;
    const T = [{ id: 'd', name: 'd', lat, lng }];
    const r = planRoute(g, start, { lat, lng }, 'd', 'drive')!;
    const rc = reachByRoad(g, start, T, 'drive')[0];
    const ro = base.planRoute(g, start, { lat, lng }, 'd', 'drive')!;
    const rco = base.reachByRoad(g, start, T, 'drive')[0];
    const near = routeToNearest(g, start, T, 'drive')!;
    out.push(`frac ${frac}: end snapped e${end.edge}@${end.offset.toFixed(1)} (loop len ${g.edgeLen[e].toFixed(1)})`);
    out.push(`  FIXED    route ${r.distanceM.toFixed(1)}m/${r.durationS.toFixed(1)}s legs=${JSON.stringify(r.legs.map((l) => ({ ...l, from: +l.from.toFixed(1), to: +l.to.toFixed(1) })))}  reach ${rc.distanceM.toFixed(1)}m/${rc.durationS.toFixed(1)}s  nearest-route ${near.route.distanceM.toFixed(1)}m`);
    out.push(`  BASELINE route ${ro.distanceM.toFixed(1)}m/${ro.durationS.toFixed(1)}s legs=${JSON.stringify(ro.legs.map((l) => ({ ...l, from: +l.from.toFixed(1), to: +l.to.toFixed(1) })))}  reach ${rco.distanceM.toFixed(1)}m/${rco.durationS.toFixed(1)}s`);
  }
  console.log(out.join('\n'));
});
