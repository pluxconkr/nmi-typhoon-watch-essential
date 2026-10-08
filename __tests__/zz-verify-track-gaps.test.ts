import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-gaps.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

interface Result { s: number; G: number; errFirst: number; maxErr: number; badFixes: number; maxBadRun: number; maxOffRoute: number; recoverM: number }

/** Drive fixes every `step` m up to s, then a gap of G m, then continue for `after` m. Returns the errors after the gap. */
function sim(r: Route, kx: number, s: number, G: number, step = 14, after = 1500): Result {
  let prev = 0;
  for (let d = 0; d <= s; d += step) prev = trackRoute(r, pointAlong(r, d), kx, prev).along;
  const out: Result = { s, G, errFirst: 0, maxErr: 0, badFixes: 0, maxBadRun: 0, maxOffRoute: 0, recoverM: 0 };
  let run = 0;
  let first = true;
  let lastBad = -1;
  const end = Math.min(r.distanceM, s + G + after);
  for (let d = s + G; d <= end; d += first ? 0.0001 + step : step) {
    const p = trackRoute(r, pointAlong(r, d), kx, prev);
    prev = p.along;
    const err = p.along - d;
    if (first) { out.errFirst = err; first = false; }
    out.maxErr = Math.max(out.maxErr, Math.abs(err));
    out.maxOffRoute = Math.max(out.maxOffRoute, p.offRouteM);
    if (Math.abs(err) > 50) { out.badFixes++; run++; out.maxBadRun = Math.max(out.maxBadRun, run); lastBad = d; }
    else run = 0;
  }
  out.recoverM = lastBad < 0 ? 0 : lastBad - (s + G);
  return out;
}

test('Tinian: GPS gap sweep', () => {
  const g = roadGraph('tinian');
  const r = planRoute(g, { lat: 15.033935, lng: 145.647902 }, { lat: 15.014668, lng: 145.635747 }, 'there', 'drive')!;
  log(`L=${r.distanceM.toFixed(0)}`);
  for (const G of [100, 200, 300, 360, 400, 500, 750, 1000, 2000, 3000]) {
    const res: Result[] = [];
    for (let s = 0; s + G < r.distanceM; s += 25) res.push(sim(r, g.kx, s, G));
    const bad = res.filter((x) => x.badFixes > 0);
    const stuck = bad.filter((x) => x.maxOffRoute <= 35);
    log(`G=${G}: scenarios=${res.length} wrong=${bad.length} (${((100 * bad.length) / res.length).toFixed(1)}%) wrongAndNeverOffRoute>35=${stuck.length}`);
    // Group the wrong ones into s-ranges
    let ranges: string[] = [];
    let a = -1, b = -1;
    for (const x of bad) {
      if (a < 0) { a = b = x.s; } else if (x.s - b <= 25) b = x.s; else { ranges.push(`${a}-${b}`); a = b = x.s; }
    }
    if (a >= 0) ranges.push(`${a}-${b}`);
    log(`   s-ranges with wrong along: ${ranges.join(', ')}`);
    const worst = bad.sort((x, y) => y.maxBadRun - x.maxBadRun)[0];
    if (worst) log(`   worst: s=${worst.s} errFirst=${worst.errFirst.toFixed(0)} maxErr=${worst.maxErr.toFixed(0)} badFixes=${worst.badFixes} maxOffRoute=${worst.maxOffRoute.toFixed(1)} recoverM=${worst.recoverM.toFixed(0)}`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
