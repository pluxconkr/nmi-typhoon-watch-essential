import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-genesis.txt';
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
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rand: () => number) {
  const u = Math.max(1e-12, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

test('Koblerville -> Genesis wholesale', () => {
  const g = roadGraph('saipan');
  const r = planRoute(g, { lat: 15.123441, lng: 145.70372 }, { lat: 15.155339, lng: 145.73919 }, 'genesis', 'drive')!;
  log(`L=${r.distanceM.toFixed(0)} pts=${r.lat.length}`);
  r.steps.forEach((s, i) => log(`step ${i}: ${s.maneuver} ${s.side ?? ''} road=${s.road} start=${s.startDist.toFixed(0)} end=${s.endDist.toFixed(0)}`));
  // lateral separation of the nearest "other" part per 250 m
  for (let a = 0; a <= r.distanceM; a += 250) {
    const p = pointAlong(r, a);
    let best = Infinity, bestB = -1;
    for (let b = 0; b <= r.distanceM; b += 5) {
      if (Math.abs(b - a) < 440) continue;
      const q = pointAlong(r, b);
      const m = Math.hypot((q.lat - p.lat) * M, (q.lng - p.lng) * M * g.kx);
      if (m < best) { best = m; bestB = b; }
    }
    log(`d=${a} nearest-other-part=${best.toFixed(1)} m at ${bestB}`);
  }
  for (const sigma of [1, 2, 3, 5]) {
    const tau = 10;
    const phi = Math.exp(-1 / tau);
    const inno = sigma * Math.sqrt(1 - phi * phi);
    let locked = 0;
    const N = 100;
    let ex1 = '';
    for (let seed = 1; seed <= N; seed++) {
      const rand = rng(seed * 7717);
      let ex = gauss(rand) * sigma, ey = gauss(rand) * sigma;
      let prev = 0, run = 0, worst = 0, first = -1, maxErr = 0, maxOffInRun = 0;
      for (let d = 0; d <= r.distanceM; d += 13) {
        ex = phi * ex + inno * gauss(rand);
        ey = phi * ey + inno * gauss(rand);
        const p = pointAlong(r, d);
        const t = trackRoute(r, { lat: p.lat + ey / M, lng: p.lng + ex / (M * g.kx) }, g.kx, prev);
        prev = t.along;
        const err = t.along - d;
        if (Math.abs(err) > 100) { run++; if (run === 1 && first < 0) first = d; worst = Math.max(worst, run); maxErr = Math.max(maxErr, Math.abs(err)); maxOffInRun = Math.max(maxOffInRun, t.offRouteM); } else run = 0;
      }
      if (worst >= 10) { locked++; if (!ex1) ex1 = `e.g. seed ${seed * 7717}: first bad at d=${first}, worst run ${worst} fixes (${(worst * 13).toFixed(0)} m), max err ${maxErr.toFixed(0)} m, max offRouteM while wrong ${maxOffInRun.toFixed(1)}`; }
    }
    log(`sigma=${sigma} m tau=${tau}s: ${locked}/${N} drives locked  ${ex1}`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
