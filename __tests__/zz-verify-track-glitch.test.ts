import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-glitch.txt';
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

/** Nearest point of the route more than `minAlong` metres away (in along) from d, as a local-metre vector from the fix. */
function mirrorVec(r: Route, kx: number, d: number, minAlong = 150) {
  const p = pointAlong(r, d);
  let best = { m: Infinity, dx: 0, dy: 0, along: -1 };
  for (let d2 = 0; d2 <= r.distanceM; d2 += 2) {
    if (Math.abs(d2 - d) < minAlong) continue;
    const q = pointAlong(r, d2);
    const dx = (q.lng - p.lng) * M * kx;
    const dy = (q.lat - p.lat) * M;
    const m = Math.hypot(dx, dy);
    if (m < best.m) best = { m, dx, dy, along: d2 };
  }
  return best;
}

function shifted(p: { lat: number; lng: number }, kx: number, dxM: number, dyM: number) {
  return { lat: p.lat + dyM / M, lng: p.lng + dxM / (M * kx) };
}

/** One glitchy fix at d (b metres towards the mirror), then clean fixes every 14 m for `after` metres. Returns final error and bad-fix count. */
function glitch(r: Route, kx: number, d: number, b: number, after = 1500) {
  const mv = mirrorVec(r, kx, d);
  if (mv.m > 60) return null;
  const k = b / mv.m;
  let prev = d - 14;
  const trueP = pointAlong(r, d);
  const first = trackRoute(r, shifted(trueP, kx, mv.dx * k, mv.dy * k), kx, prev);
  prev = first.along;
  let bad = 0;
  let lastErr = 0;
  let maxOff = first.offRouteM;
  for (let x = d + 14; x <= Math.min(r.distanceM, d + after); x += 14) {
    const p = trackRoute(r, pointAlong(r, x), kx, prev);
    prev = p.along;
    lastErr = p.along - x;
    maxOff = Math.max(maxOff, p.offRouteM);
    if (Math.abs(lastErr) > 50) bad++;
  }
  return { mirrorAlong: mv.along, mirrorM: mv.m, firstErr: first.along - d, bad, lastErr, maxOff };
}

test('Tinian: single glitch fix toward the other carriageway', () => {
  const g = roadGraph('tinian');
  const r = planRoute(g, { lat: 15.033935, lng: 145.647902 }, { lat: 15.014668, lng: 145.635747 }, 'there', 'drive')!;
  for (const b of [10, 17, 25, 40, 100]) {
    const locks: { d: number; mirrorAlong: number; bad: number; lastErr: number; maxOff: number }[] = [];
    let tested = 0;
    for (let d = 1500; d < r.distanceM - 200; d += 25) {
      const res = glitch(r, g.kx, d, b);
      if (!res) continue;
      tested++;
      if (res.bad >= 20) locks.push({ d, mirrorAlong: res.mirrorAlong, bad: res.bad, lastErr: res.lastErr, maxOff: res.maxOff });
    }
    log(`b=${b} m: tested ${tested} positions on divided stretches, locked ${locks.length}`);
    let a = -1, z = -1;
    const ranges: string[] = [];
    for (const x of locks) { if (a < 0) { a = z = x.d; } else if (x.d - z <= 25) z = x.d; else { ranges.push(`${a}-${z}`); a = z = x.d; } }
    if (a >= 0) ranges.push(`${a}-${z}`);
    log(`   d-ranges that lock for >=20 fixes: ${ranges.join(', ')}`);
    const w = locks.sort((x, y) => y.bad - x.bad)[0];
    if (w) log(`   example: d=${w.d} mirrorAlong=${w.mirrorAlong} badFixes=${w.bad} finalErr=${w.lastErr.toFixed(0)} maxOffRoute=${w.maxOff.toFixed(1)}`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
