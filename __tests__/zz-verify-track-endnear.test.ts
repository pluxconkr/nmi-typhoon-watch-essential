import fs from 'fs';
import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import { roadGraph } from '@/data/roads';
import { edgeUsable } from '@/domain/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-endnear.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);
const M = 111_320;

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
function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

test('routes whose end is near an earlier part of the same route', () => {
  const list = shelters.shelters.filter((s) => s.designation !== 'past');
  const rand = rng(777);
  let routes = 0;
  const hits: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = [...list.filter((s) => s.island === island).map((s) => ({ lat: s.lat, lng: s.lng, name: s.shelterId })), ...supplies.stores.filter((s) => s.island === island).map((s) => ({ lat: s.lat, lng: s.lng, name: s.id }))];
    const want = island === 'saipan' ? 3000 : 600;
    let made = 0, tries = 0;
    while (made < want && tries++ < want * 6) {
      const e = Math.floor(rand() * g.edgeCount);
      if (!edgeUsable(g, e, 'drive')) continue;
      const a = g.geomStart[e];
      const from = { lat: g.ptLat[a], lng: g.ptLng[a] };
      const to = dests[Math.floor(rand() * dests.length)];
      const r = planRoute(g, from, to, to.name, 'drive');
      if (!r || r.distanceM < 300) continue;
      made++; routes++;
      // distance from the route END to earlier parts (excluding the last 100 m)
      let best = Infinity, bestD = -1;
      for (let d = 0; d < r.distanceM - 100; d += 5) {
        const p = pointAlong(r, d);
        const m = Math.hypot((p.lat - r.end.lat) * M, (p.lng - r.end.lng) * M * g.kx);
        if (m < best) { best = m; bestD = d; }
      }
      if (best < 30) hits.push(`${island} (${from.lat.toFixed(6)},${from.lng.toFixed(6)}) -> ${to.name} (${to.lat.toFixed(6)},${to.lng.toFixed(6)}) L=${r.distanceM.toFixed(0)}: end is ${best.toFixed(1)} m from route point at along=${bestD} (${(r.distanceM - bestD).toFixed(0)} m before the end)`);
    }
  }
  log(`routes=${routes}, ends within 30 m of an earlier route point: ${hits.length}`);
  hits.slice(0, 40).forEach(log);
  fs.writeFileSync(OUT, lines.join('\n'));
});
