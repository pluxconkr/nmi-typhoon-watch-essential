import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-glitch2.txt';
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

test('Koblerville -> Genesis wholesale: a single glitchy fix after the Isa Drive U-turn', () => {
  const g = roadGraph('saipan');
  const r = planRoute(g, { lat: 15.123441, lng: 145.70372 }, { lat: 15.155339, lng: 145.73919 }, 'genesis', 'drive')!;
  for (const b of [6, 9, 12, 20, 40]) {
    const locks: { d: number; bad: number; lastErr: number; maxOff: number; mirror: number; msep: number }[] = [];
    let tested = 0;
    for (let d = 8480; d <= 9400; d += 10) {
      const mv = mirrorVec(r, g.kx, d);
      if (mv.m > 30) continue;
      tested++;
      const k = b / mv.m;
      let prev = d - 13;
      const p0 = pointAlong(r, d);
      const first = trackRoute(r, { lat: p0.lat + (mv.dy * k) / M, lng: p0.lng + (mv.dx * k) / (M * g.kx) }, g.kx, prev);
      prev = first.along;
      let bad = 0, lastErr = 0, maxOff = 0;
      for (let x = d + 13; x <= Math.min(r.distanceM - 30, d + 2500); x += 13) {
        const t = trackRoute(r, pointAlong(r, x), g.kx, prev);
        prev = t.along;
        lastErr = t.along - x;
        maxOff = Math.max(maxOff, t.offRouteM);
        if (Math.abs(lastErr) > 50) bad++;
      }
      if (bad >= 20) locks.push({ d, bad, lastErr, maxOff, mirror: mv.along, msep: mv.m });
    }
    log(`glitch ${b} m toward the other carriageway: tested ${tested} positions after the U-turn, locked ${locks.length}`);
    const w = locks[0];
    if (w) log(`   first locking position d=${w.d} (carriageway separation ${w.msep.toFixed(1)} m, mirror along=${w.mirror}) -> badFixes=${w.bad} finalErr=${w.lastErr.toFixed(0)} m maxOffRouteAfterGlitch=${w.maxOff.toFixed(1)} m`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
