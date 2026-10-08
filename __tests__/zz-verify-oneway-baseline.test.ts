import { roadGraph } from '@/data/roads';
import { planRoute, reachByRoad } from '@/domain/routing';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');

test('baseline loads and matches current on a normal route', () => {
  const g = roadGraph('saipan');
  const a = planRoute(g, { lat: 15.2069, lng: 145.7196 }, { lat: 15.1, lng: 145.75 }, 'x', 'drive')!;
  const b = base.planRoute(g, { lat: 15.2069, lng: 145.7196 }, { lat: 15.1, lng: 145.75 }, 'x', 'drive')!;
  expect(a.distanceM).toBeCloseTo(b.distanceM, 3);
  expect(a.durationS).toBeCloseTo(b.durationS, 3);
});

test('loop e1067: fixed vs baseline', () => {
  const g = roadGraph('saipan');
  const n = g.edgeFrom[1067];
  const pos = { lat: g.nodeLat[n], lng: g.nodeLng[n] };
  const dest = { lat: 15.1, lng: 145.75 };
  const T = [{ id: 'd', name: 'd', ...dest }];
  const cur = planRoute(g, pos, dest, 'd', 'drive')!;
  const curReach = reachByRoad(g, pos, T, 'drive')[0];
  const old = base.planRoute(g, pos, dest, 'd', 'drive')!;
  const oldReach = base.reachByRoad(g, pos, T, 'drive')[0];
  console.log(
    [
      `FIXED    planRoute dist=${cur.distanceM.toFixed(1)} dur=${cur.durationS.toFixed(1)} | reach dist=${curReach.distanceM.toFixed(1)} dur=${curReach.durationS.toFixed(1)}`,
      `BASELINE planRoute dist=${old.distanceM.toFixed(1)} dur=${old.durationS.toFixed(1)} | reach dist=${oldReach.distanceM.toFixed(1)} dur=${oldReach.durationS.toFixed(1)}`,
    ].join('\n'),
  );
});
