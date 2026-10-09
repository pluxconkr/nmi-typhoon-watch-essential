import fs from 'fs';
import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-offroute.txt';
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
function minDist(r: Route, kx: number, f: { lat: number; lng: number }) {
  let best = Infinity;
  for (let i = 0; i < r.lat.length - 1; i++) {
    const ax = (r.lng[i] - f.lng) * M * kx, ay = (r.lat[i] - f.lat) * M, bx = (r.lng[i + 1] - f.lng) * M * kx, by = (r.lat[i + 1] - f.lat) * M;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

function offsetFix(r: Route, kx: number, d: number, off: number) {
  const a = pointAlong(r, Math.max(0, d - 5));
  const b = pointAlong(r, Math.min(r.distanceM, d + 5));
  const p = pointAlong(r, d);
  const dx = (b.lng - a.lng) * M * kx, dy = (b.lat - a.lat) * M;
  const len = Math.hypot(dx, dy) || 1;
  // left-hand normal
  const nx = -dy / len, ny = dx / len;
  return { lat: p.lat + (ny * off) / M, lng: p.lng + (nx * off) / (M * kx) };
}

test('off-route reporting versus brute-force distance, on four real routes', () => {
  const routes: { name: string; r: Route; kx: number }[] = [];
  const sg = roadGraph('saipan');
  const tg = roadGraph('tinian');
  const kag = shelters.shelters.find((s) => s.shelterId === 'kagman-high-school')!;
  routes.push({ name: 'Garapan->Kagman HS', r: planRoute(sg, { lat: 15.2069, lng: 145.7196 }, kag, 'k', 'drive')!, kx: sg.kx });
  routes.push({ name: 'Tinian Broadway', r: planRoute(tg, { lat: 15.033935, lng: 145.647902 }, { lat: 15.014668, lng: 145.635747 }, 't', 'drive')!, kx: tg.kx });
  routes.push({ name: 'Koblerville->Genesis', r: planRoute(sg, { lat: 15.123441, lng: 145.70372 }, { lat: 15.155339, lng: 145.73919 }, 'g', 'drive')!, kx: sg.kx });
  routes.push({ name: 'Marpi->Susupe', r: planRoute(sg, { lat: 15.270203, lng: 145.798487 }, { lat: 15.1577, lng: 145.709857 }, 's', 'drive')!, kx: sg.kx });
  for (const { name, r, kx } of routes) {
    for (const off of [50, 100, 300]) {
      let n = 0, over = 0, maxOver = 0, falseOn = 0, jump = 0, falseOnJump = 0;
      for (let d = 50; d < r.distanceM - 50; d += 25) {
        for (const sign of [1, -1]) {
          const f = offsetFix(r, kx, d, sign * off);
          const t = trackRoute(r, f, kx, d);
          const mn = minDist(r, kx, f);
          n++;
          if (t.offRouteM - mn > 5) { over++; maxOver = Math.max(maxOver, t.offRouteM - mn); }
          if (Math.abs(t.along - d) > 150) { jump++; if (t.offRouteM <= 35) falseOnJump++; }
          if (off > 35 && t.offRouteM <= 35 && mn <= 35) falseOn++; // legit: another part of the route is within 35 m
        }
      }
      log(`${name}: lateral offset ${off} m (prevAlong = true position): ${n} fixes; offRouteM exceeds true nearest distance by >5 m in ${over} (max +${maxOver.toFixed(0)} m); matched >150 m away along the route in ${jump} (of which reported on-route: ${falseOnJump})`);
    }
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
