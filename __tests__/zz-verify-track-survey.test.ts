import fs from 'fs';
import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { VILLAGES } from '@/domain/places';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-survey.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);
const M = 111_320;

function samplePoints(r: Route, step = 10) {
  const pts: { d: number; lat: number; lng: number }[] = [];
  let i = 1;
  for (let d = 0; d <= r.distanceM; d += step) {
    while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
    const span = r.cumDist[i] - r.cumDist[i - 1];
    const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
    pts.push({ d, lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) });
  }
  return pts;
}

/** Number of 10 m samples that have another part of the route (more than `minAlong` m away along the route) within `maxM`. */
function selfApproach(pts: { d: number; lat: number; lng: number }[], kx: number, minAlong: number, maxM: number) {
  let n = 0;
  for (let a = 0; a < pts.length; a++) {
    for (let b = 0; b < pts.length; b++) {
      if (Math.abs(pts[a].d - pts[b].d) < minAlong) continue;
      const dx = (pts[a].lng - pts[b].lng) * M * kx;
      const dy = (pts[a].lat - pts[b].lat) * M;
      if (dx * dx + dy * dy < maxM * maxM) { n++; break; }
    }
  }
  return n;
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

function noisyDrive(r: Route, pts: { d: number; lat: number; lng: number }[], kx: number, sigma: number, tau: number, seed: number, stepIdx = 1) {
  const rand = rng(seed);
  const phi = Math.exp(-1 / tau);
  const inno = sigma * Math.sqrt(1 - phi * phi);
  let ex = gauss(rand) * sigma, ey = gauss(rand) * sigma;
  let prev = 0, run = 0, worst = 0, maxOff = 0;
  for (let i = 0; i < pts.length; i += stepIdx) {
    ex = phi * ex + inno * gauss(rand);
    ey = phi * ey + inno * gauss(rand);
    const p = pts[i];
    const t = trackRoute(r, { lat: p.lat + ey / M, lng: p.lng + ex / (M * kx) }, kx, prev);
    prev = t.along;
    if (Math.abs(t.along - p.d) > 100) { run++; worst = Math.max(worst, run); maxOff = Math.max(maxOff, t.offRouteM); } else run = 0;
  }
  return { worst, maxOff };
}

import supplies from '@/assets/data/supplies.json';
import { edgeUsable } from '@/domain/roads';

test('survey: random road points -> shelters and stores on all three islands', () => {
  const list = shelters.shelters.filter((s) => s.designation !== 'past');
  const stores = supplies.stores;
  const rows: string[] = [];
  const totals = { routes: 0, exposed: 0, lockedS3: 0, lockedS5: 0, lockedS8: 0, lockedS5Off: 0 };
  const rand = rng(99);
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const starts: { lat: number; lng: number; name: string }[] = VILLAGES.filter((v) => v.island === island).map((v) => ({ lat: v.lat, lng: v.lng, name: v.name }));
    let tries = 0;
    while (starts.length < 60 && tries++ < 5000) {
      const e = Math.floor(rand() * g.edgeCount);
      if (!edgeUsable(g, e, 'drive')) continue;
      const a = g.geomStart[e];
      starts.push({ lat: g.ptLat[a], lng: g.ptLng[a], name: 'edge' + e });
    }
    const dests = [...list.filter((s) => s.island === island).map((s) => ({ lat: s.lat, lng: s.lng, name: s.shelterId })), ...stores.filter((s) => s.island === island).slice(0, 25).map((s) => ({ lat: s.lat, lng: s.lng, name: s.id }))];
    for (const v of starts) {
      for (const s of dests) {
        const r = planRoute(g, v, s, s.name, 'drive');
        if (!r || r.distanceM < 300) continue;
        const pts = samplePoints(r, 13);
        const nSelf = selfApproach(pts, g.kx, 440, 30);
        totals.routes++;
        if (nSelf === 0) continue;
        totals.exposed++;
        const a = noisyDrive(r, pts, g.kx, 3, 10, 12345 + totals.routes);
        const b = noisyDrive(r, pts, g.kx, 5, 10, 12345 + totals.routes);
        const c = noisyDrive(r, pts, g.kx, 8, 10, 12345 + totals.routes);
        const l3 = a.worst >= 10, l5 = b.worst >= 10, l8 = c.worst >= 10;
        if (l3) totals.lockedS3++;
        if (l5) totals.lockedS5++;
        if (l8) totals.lockedS8++;
        if (l5 && b.maxOff <= 35) totals.lockedS5Off++;
        rows.push(`${island} ${v.name} (${v.lat.toFixed(6)},${v.lng.toFixed(6)}) -> ${s.name} (${s.lat.toFixed(6)},${s.lng.toFixed(6)}): L=${r.distanceM.toFixed(0)} selfApproachSamples=${nSelf} lock(s=3)=${l3} lock(s=5)=${l5} lock(s=8)=${l8}`);
      }
    }
  }
  log(`routes=${totals.routes} withParallelStretch(<30m, >440m apart along route)=${totals.exposed}`);
  log(`of the exposed routes, one noisy drive each: locked at sigma 3 m: ${totals.lockedS3}, sigma 5 m: ${totals.lockedS5} (no off-route alarm: ${totals.lockedS5Off}), sigma 8 m: ${totals.lockedS8}`);
  rows.forEach(log);
  fs.writeFileSync(OUT, lines.join('\n'));
});
