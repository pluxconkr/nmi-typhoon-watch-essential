import fs from 'fs';
import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import { roadGraph } from '@/data/roads';
import { edgeUsable } from '@/domain/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-gapsurvey.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);

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

test('gap survey on random real routes (noise-free fixes)', () => {
  const list = shelters.shelters.filter((s) => s.designation !== 'past');
  const rand = rng(2024);
  const stats: Record<number, { n: number; wrong: number; wrongNoAlarm: number; maxErr: number; examples: string[] }> = {};
  const GAPS = [500, 1000, 2000, 3000];
  for (const G of GAPS) stats[G] = { n: 0, wrong: 0, wrongNoAlarm: 0, maxErr: 0, examples: [] };
  let routes = 0;
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = [...list.filter((s) => s.island === island).map((s) => ({ lat: s.lat, lng: s.lng, name: s.shelterId })), ...supplies.stores.filter((s) => s.island === island).slice(0, 25).map((s) => ({ lat: s.lat, lng: s.lng, name: s.id }))];
    const want = island === 'saipan' ? 500 : 150;
    let made = 0, tries = 0;
    while (made < want && tries++ < want * 20) {
      const e = Math.floor(rand() * g.edgeCount);
      if (!edgeUsable(g, e, 'drive')) continue;
      const a = g.geomStart[e];
      const from = { lat: g.ptLat[a], lng: g.ptLng[a] };
      const to = dests[Math.floor(rand() * dests.length)];
      const r = planRoute(g, from, to, to.name, 'drive');
      if (!r || r.distanceM < 1500) continue;
      made++; routes++;
      for (const G of GAPS) {
        if (r.distanceM < G + 700) continue;
        for (let k = 0; k < 4; k++) {
          const s = rand() * (r.distanceM - G - 600);
          // arrive at s with perfect tracking, then a gap of G m, then fixes every 13 m for 600 m
          let prev = s;
          let bad = 0, run = 0, worstRun = 0, maxOff = 0, maxErr = 0, firstErr = 0, firstSet = false;
          for (let d = s + G; d <= Math.min(r.distanceM, s + G + 600); d += 13) {
            const t = trackRoute(r, pointAlong(r, d), g.kx, prev);
            prev = t.along;
            const err = t.along - d;
            if (!firstSet) { firstErr = err; firstSet = true; }
            maxErr = Math.max(maxErr, Math.abs(err));
            if (Math.abs(err) > 50) { bad++; run++; worstRun = Math.max(worstRun, run); if (t.offRouteM > 35) run = run; } else run = 0;
          }
          // does the NavSession's rule (3 consecutive fixes beyond 35 m) fire at some point while wrong?
          // recompute with offRoute run tracking
          prev = s;
          let offRun = 0, alarm = false;
          for (let d = s + G; d <= Math.min(r.distanceM, s + G + 600); d += 13) {
            const t = trackRoute(r, pointAlong(r, d), g.kx, prev);
            prev = t.along;
            offRun = t.offRouteM > 35 ? offRun + 1 : 0;
            if (offRun >= 3) { alarm = true; break; }
          }
          const st = stats[G];
          st.n++;
          if (worstRun >= 3) {
            st.wrong++;
            if (!alarm) st.wrongNoAlarm++;
            st.maxErr = Math.max(st.maxErr, maxErr);
            if (st.examples.length < 3) st.examples.push(`${island} (${from.lat.toFixed(6)},${from.lng.toFixed(6)})->${to.name} s=${s.toFixed(0)} firstErr=${firstErr.toFixed(0)} badFixes=${bad} alarm=${alarm}`);
          }
        }
      }
    }
  }
  log(`routes=${routes}`);
  for (const G of GAPS) {
    const st = stats[G];
    log(`gap ${G} m: scenarios=${st.n} wrong(>=3 fixes with |err|>50 m)=${st.wrong} (${((100 * st.wrong) / st.n).toFixed(1)}%) wrongWithNoOffRouteAlarm=${st.wrongNoAlarm} maxErr=${st.maxErr.toFixed(0)}`);
    st.examples.forEach((x) => log('    ' + x));
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
