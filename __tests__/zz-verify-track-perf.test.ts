import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-perf.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);
const M = 111_320;

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

test('performance on the longest Saipan route and a synthetic 100k-point route', () => {
  const g = roadGraph('saipan');
  // Marpi (north tip) -> south of Saipan
  const r = planRoute(g, { lat: 15.270203, lng: 145.798487 }, { lat: 15.1577, lng: 145.709857 }, 'south', 'drive')!;
  log(`route: ${r.distanceM.toFixed(0)} m, ${r.lat.length} points`);
  const fixes = Array.from({ length: 2000 }, (_, i) => pointAlong(r, (i / 2000) * r.distanceM));
  let prev = 0;
  // warm up
  for (let i = 0; i < 2000; i++) prev = trackRoute(r, fixes[i], g.kx, prev).along;
  const t0 = performance.now();
  const REPS = 10;
  for (let k = 0; k < REPS; k++) { prev = 0; for (let i = 0; i < 2000; i++) prev = trackRoute(r, fixes[i], g.kx, prev).along; }
  const t1 = performance.now();
  log(`${((t1 - t0) / (REPS * 2000) * 1000).toFixed(1)} microseconds per fix on a ${r.lat.length}-point route`);
  // synthetic long route: 100k points
  const n = 100_000;
  const big: Route = { ...r, lat: [], lng: [], cumDist: [], cumTime: [] } as Route;
  for (let i = 0; i < n; i++) { big.lat.push(15.0 + i * 1e-6); big.lng.push(145.7); big.cumDist.push(i * 0.1113); big.cumTime.push(i * 0.01); }
  (big as any).distanceM = big.cumDist[n - 1];
  (big as any).durationS = big.cumTime[n - 1];
  const t2 = performance.now();
  for (let i = 0; i < 100; i++) trackRoute(big, { lat: 15.05, lng: 145.7001 }, g.kx, 5000);
  const t3 = performance.now();
  log(`${((t3 - t2) / 100).toFixed(2)} ms per fix on a ${n}-point route`);
  fs.writeFileSync(OUT, lines.join('\n'));
});
