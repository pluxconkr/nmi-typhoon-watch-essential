/* TEMPORARY verification file (zz-verify-scc-*): turn-by-turn steps before vs after for routes through the junctions that lost a branch. */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { decodeRoadGraph, edgeNameOf, edgeSlice, edgeUsable, snapToRoad } from '@/domain/roads';
import { instructionFor, planRoute } from '@/domain/routing';

const BEFORE_DIR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/roads-before';
const gb = decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-saipan.json`, 'utf8')), 'saipan');
const ga = roadGraph('saipan');
const list = (shelters.shelters as any[]).filter((s) => s.island === 'saipan');
const NODES = [748, 4747, 5270, 265];

test('steps through junctions that lost a branch', () => {
  const origins: { n: number; e: number; off: number; lat: number; lng: number }[] = [];
  for (const n of NODES) {
    for (let i = ga.adjStart[n]; i < ga.adjStart[n + 1]; i++) {
      const e = ga.adjEdges[i];
      if (!edgeUsable(ga, e, 'drive')) continue;
      const atFrom = ga.edgeFrom[e] === n;
      for (const dist of [10, 40, 120, 300, 700]) {
        const off = atFrom ? Math.min(dist, ga.edgeLen[e]) : Math.max(0, ga.edgeLen[e] - dist);
        const [p] = edgeSlice(ga, e, off, off);
        origins.push({ n, e, off, lat: p[0], lng: p[1] });
      }
    }
  }
  const lines: string[] = [];
  let routes = 0;
  let throughAffected = 0;
  let sameDist = 0;
  let stepDiffs = 0;
  const kinds: Record<string, number> = {};
  const byOrigin: Record<string, number> = {};
  const examples: string[] = [];
  for (const o of origins) {
    for (const dest of [...list.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name })), ...origins.filter((x) => x.n !== o.n).map((x) => ({ lat: x.lat, lng: x.lng, name: `pt${x.n}/${x.e}` }))]) {
      const ra = planRoute(ga, o, dest, dest.name, 'drive');
      const rb = planRoute(gb, o, dest, dest.name, 'drive');
      if (!ra || !rb) { lines.push(`NULL route: ${JSON.stringify(o)} -> ${dest.name} after=${!!ra} before=${!!rb}`); continue; }
      routes++;
      const passes = ra.legs.some((l) => NODES.includes(ga.edgeFrom[l.edge]) || NODES.includes(ga.edgeTo[l.edge]));
      if (passes) throughAffected++;
      if (Math.abs(ra.distanceM - rb.distanceM) < 1e-6) sameDist++;
      const key = (st: any) => `${st.maneuver}/${st.side}/${st.road}`;
      const sa = ra.steps.map(key);
      const sbb = rb.steps.map(key);
      const posA = ra.steps.map((st) => Math.round(st.startDist));
      const posB = rb.steps.map((st) => Math.round(st.startDist));
      if (JSON.stringify(sa) !== JSON.stringify(sbb) || JSON.stringify(posA) !== JSON.stringify(posB)) {
        stepDiffs++;
        const kind = JSON.stringify(sa) === JSON.stringify(sbb) ? 'same steps, different positions' : sa.length > sbb.length ? 'step added' : sa.length < sbb.length ? 'step removed' : 'steps changed';
        kinds[kind] = (kinds[kind] ?? 0) + 1;
        const sig = `${o.n}/${o.e}`;
        byOrigin[sig] = (byOrigin[sig] ?? 0) + 1;
        if (kind !== 'same steps, different positions' && examples.length < 10) {
          examples.push(`[${kind}] ${sig}@${o.off.toFixed(0)} -> ${dest.name}\n   before: ${rb.steps.map((st) => instructionFor(st, dest.name) + `@${Math.round(st.startDist)}`).join(' | ')}\n   after : ${ra.steps.map((st) => instructionFor(st, dest.name) + `@${Math.round(st.startDist)}`).join(' | ')}`);
        }
      }
    }
  }
  lines.unshift(`origins=${origins.length} routes=${routes} passingAffectedNodes=${throughAffected} sameDistance=${sameDist} stepDiffs=${stepDiffs} kinds=${JSON.stringify(kinds)} byOrigin=${JSON.stringify(byOrigin)}`, ...examples);
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
});
