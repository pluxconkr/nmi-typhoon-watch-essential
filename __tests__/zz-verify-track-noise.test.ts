import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-noise.txt';
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

// Small deterministic PRNG so runs are reproducible.
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
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function drive(r: Route, kx: number, sigma: number, tau: number, seed: number, speed = 13) {
  const rand = rng(seed);
  const phi = Math.exp(-1 / tau);
  const inno = sigma * Math.sqrt(1 - phi * phi);
  let ex = gauss(rand) * sigma;
  let ey = gauss(rand) * sigma;
  let prev = 0;
  let worstRun = 0;
  let run = 0;
  let maxErr = 0;
  let firstBadAt = -1;
  let maxOffWhileBad = 0;
  let lastErr = 0;
  for (let d = 0; d <= r.distanceM; d += speed) {
    ex = phi * ex + inno * gauss(rand);
    ey = phi * ey + inno * gauss(rand);
    const p = pointAlong(r, d);
    const fix = { lat: p.lat + ey / M, lng: p.lng + ex / (M * kx) };
    const t = trackRoute(r, fix, kx, prev);
    prev = t.along;
    const err = t.along - d;
    lastErr = err;
    maxErr = Math.max(maxErr, Math.abs(err));
    if (Math.abs(err) > 100) {
      run++;
      if (run === 1) firstBadAt = d;
      if (run >= worstRun) { worstRun = run; maxOffWhileBad = Math.max(maxOffWhileBad, t.offRouteM); }
    } else run = 0;
  }
  return { worstRun, maxErr, firstBadAt, maxOffWhileBad, lastErr };
}

test('Tinian: correlated GPS noise along the whole route (no gaps)', () => {
  const g = roadGraph('tinian');
  const r = planRoute(g, { lat: 15.033935, lng: 145.647902 }, { lat: 15.014668, lng: 145.635747 }, 'there', 'drive')!;
  for (const [sigma, tau] of [[3, 10], [5, 10], [8, 10], [12, 10], [5, 30], [8, 30]] as const) {
    const N = 150;
    let locked = 0;
    let wouldReplan = 0;
    const examples: string[] = [];
    for (let seed = 1; seed <= N; seed++) {
      const res = drive(r, g.kx, sigma, tau, seed * 7919);
      if (res.worstRun >= 10) {
        locked++;
        if (res.maxOffWhileBad > 35) wouldReplan++;
        if (examples.length < 3) examples.push(`seed=${seed * 7919} firstBadAt=${res.firstBadAt} worstRun=${res.worstRun} maxErr=${res.maxErr.toFixed(0)}`);
      }
    }
    log(`sigma=${sigma} m, correlation ${tau} s: ${locked}/${N} drives had >=10 consecutive fixes with progress error >100 m (${((100 * locked) / N).toFixed(1)}%)  e.g. ${examples.join(' | ')}`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
