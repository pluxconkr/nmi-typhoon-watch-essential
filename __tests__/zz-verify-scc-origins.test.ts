/* TEMPORARY verification file (zz-verify-scc-*): per-origin effect around the six removed edges (shelter targets). */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { decodeRoadGraph, snapToRoad } from '@/domain/roads';
import { reachByRoad } from '@/domain/routing';

const BEFORE_DIR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/roads-before';
const gb = decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-saipan.json`, 'utf8')), 'saipan');
const ga = roadGraph('saipan');
const REMOVED = [1035, 5013, 5014, 5918, 6093, 6094];
const T = (shelters.shelters as any[]).filter((s) => s.island === 'saipan').map((s) => ({ id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng }));

test('per-origin effect (dense grid, every 10 m within 120 m of each removed edge)', () => {
  const M = 111_320;
  const seen = new Set<string>();
  const rows: any[] = [];
  let origins = 0;
  let snapChanged = 0;
  let nullBefore = 0;
  let nullAfter = 0;
  let lostRoutes = 0;
  let gainedRoutes = 0;
  const deltas: number[] = [];
  for (const e of REMOVED) {
    const s = ga.geomStart[e];
    const cLat = (ga.ptLat[s] + ga.ptLat[s + ga.geomCount[e] - 1]) / 2;
    const cLng = (ga.ptLng[s] + ga.ptLng[s + ga.geomCount[e] - 1]) / 2;
    for (let dy = -160; dy <= 160; dy += 10) {
      for (let dx = -160; dx <= 160; dx += 10) {
        const o = { lat: cLat + dy / M, lng: cLng + dx / (M * ga.kx) };
        const key = `${o.lat.toFixed(6)},${o.lng.toFixed(6)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const sb = snapToRoad(gb, o, 'drive');
        const sa = snapToRoad(ga, o, 'drive');
        if (!sb || !sa) { if (!sb) nullBefore++; if (!sa) nullAfter++; continue; }
        // only origins that the old graph snapped onto one of the six edges are affected by the change at all
        if (!REMOVED.includes(sb.edge)) {
          if (sa.edge !== sb.edge || Math.abs(sa.offset - sb.offset) > 1e-9) throw new Error('snap changed although the old snap was not a removed edge');
          continue;
        }
        origins++;
        snapChanged++;
        const ra = new Map(reachByRoad(ga, o, T, 'drive').map((r) => [r.id, r]));
        const rb = new Map(reachByRoad(gb, o, T, 'drive').map((r) => [r.id, r]));
        const ds: number[] = [];
        for (const t of T) {
          const a = ra.get(t.id);
          const b = rb.get(t.id);
          if (b && !a) lostRoutes++;
          if (a && !b) gainedRoutes++;
          if (a && b) ds.push(a.distanceM - b.distanceM);
        }
        deltas.push(...ds);
        rows.push({ lat: +o.lat.toFixed(6), lng: +o.lng.toFixed(6), oldEdge: sb.edge, oldD: +sb.distM.toFixed(1), newEdge: sa.edge, newD: +sa.distM.toFixed(1), n: ds.length, maxDelta: ds.length ? +Math.max(...ds).toFixed(1) : null, minDelta: ds.length ? +Math.min(...ds).toFixed(1) : null, oldRoutable: rb.size, newRoutable: ra.size });
      }
    }
  }
  deltas.sort((x, y) => x - y);
  const pct = (q: number) => deltas[Math.min(deltas.length - 1, Math.floor(q * deltas.length))];
  const bad = rows.filter((r) => r.maxDelta !== null && r.maxDelta > 100);
  const oldNull = rows.filter((r) => r.oldRoutable === 0);
  const summary = { origins: rows.length, lostRoutes, gainedRoutes, nullBefore, nullAfter, pairsBothRoutable: deltas.length, delta: { min: deltas[0], p5: pct(0.05), median: pct(0.5), p95: pct(0.95), max: deltas[deltas.length - 1] }, originsWorseThan100m: bad.length, originsOldGraphHadNoRoute: oldNull.length };
  fs.writeFileSync('/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/verify-scc/ts-origins.json', JSON.stringify({ summary, bad: bad.slice(0, 40), sample: rows.slice(0, 10) }, null, 1));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary) + '\nworse than 100m (first 15):\n' + bad.slice(0, 15).map((r) => JSON.stringify(r)).join('\n'));
  expect(lostRoutes).toBe(0);
  expect(nullAfter).toBe(0);
});
