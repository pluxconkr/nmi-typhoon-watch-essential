import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { NavSession } from '@/services/navigation';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-garapan2.txt';
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

test('Garapan -> Susupe: noisy drives at sigma 5', () => {
  const g = roadGraph('saipan');
  const start = { lat: 15.207085, lng: 145.720861 };
  const dest = { lat: 15.1577, lng: 145.709857 };
  const r = planRoute(g, start, dest, 'er-wholesale', 'drive')!;
  const sigma = 5, tau = 10;
  const phi = Math.exp(-1 / tau);
  const inno = sigma * Math.sqrt(1 - phi * phi);
  let lockedDrives = 0;
  const N = 200;
  const kinds: Record<string, number> = {};
  let shown = 0;
  for (let seed = 1; seed <= N; seed++) {
    const rand = rng(seed * 104729);
    let ex = gauss(rand) * sigma, ey = gauss(rand) * sigma;
    let prev = 0, run = 0, worst = 0, worstStart = 0, worstEnd = 0, runStart = 0, kind = '';
    let rows: string[] = [];
    for (let d = 0; d <= r.distanceM; d += 13) {
      ex = phi * ex + inno * gauss(rand);
      ey = phi * ey + inno * gauss(rand);
      const p = pointAlong(r, d);
      const t = trackRoute(r, { lat: p.lat + ey / M, lng: p.lng + ex / (M * g.kx) }, g.kx, prev);
      prev = t.along;
      const err = t.along - d;
      if (Math.abs(err) > 100) {
        if (run === 0) runStart = d;
        run++;
        if (run > worst) { worst = run; worstStart = runStart; worstEnd = d; kind = err > 0 ? 'ahead' : 'behind'; }
        if (rows.length < 400) rows.push(`   d=${d} along=${t.along.toFixed(0)} err=${err.toFixed(0)} off=${t.offRouteM.toFixed(1)} remaining=${t.remainingM.toFixed(0)}`);
      } else run = 0;
    }
    if (worst >= 10) {
      lockedDrives++;
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (shown++ < 2) { log(`seed ${seed * 104729}: locked ${kind} from d=${worstStart} to d=${worstEnd} (${worst} fixes)`); rows.slice(0, 6).forEach(log); log('   ...'); rows.slice(-3).forEach(log); }
    }
  }
  log(`sigma=${sigma}: ${lockedDrives}/${N} drives locked >=10 fixes with |err|>100 m; kinds=${JSON.stringify(kinds)}`);
  fs.writeFileSync(OUT, lines.join('\n'));
});
