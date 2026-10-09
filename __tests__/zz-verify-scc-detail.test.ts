/* TEMPORARY verification file (zz-verify-scc-*): detail of the worst-case origin near the cul-de-sac loop (edges 5013/5014). */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { decodeRoadGraph, edgeClass, edgeNameOf, edgeReversible, edgeUsable, snapToRoad } from '@/domain/roads';
import { instructionFor, planRoute } from '@/domain/routing';

const BEFORE_DIR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/roads-before';
const gb = decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-saipan.json`, 'utf8')), 'saipan');
const ga = roadGraph('saipan');
const k = (shelters.shelters as any[]).find((s) => s.shelterId === 'koblerville-elementary-school');

test('detail', () => {
  const lines: string[] = [];
  const describeEdge = (g: any, e: number) => `e${e} ${g.edgeFrom[e]}->${g.edgeTo[e]} len=${g.edgeLen[e].toFixed(0)} cls=${edgeClass(g, e)} oneway=${!edgeReversible(g, e, 'drive')} usable=${edgeUsable(g, e, 'drive')} name=${edgeNameOf(g, e)}`;
  for (const e of [231, 232, 5737, 4454, 5013, 5014]) lines.push(describeEdge(ga, e));
  // nodes 265 (tip) and its neighbours
  lines.push('node 265 edges: ' + [...Array(ga.adjStart[266] - ga.adjStart[265]).keys()].map((i) => describeEdge(ga, ga.adjEdges[ga.adjStart[265] + i])).join(' | '));
  for (const o of [{ lat: 15.122461, lng: 145.723061 }, { lat: 15.12282, lng: 145.72334 }]) {
    const sb = snapToRoad(gb, o, 'drive')!;
    const sa = snapToRoad(ga, o, 'drive')!;
    lines.push(`\norigin ${o.lat},${o.lng}: old snap e${sb.edge} d=${sb.distM.toFixed(1)} -> (${sb.lat.toFixed(6)},${sb.lng.toFixed(6)}); new snap e${sa.edge} d=${sa.distM.toFixed(1)} -> (${sa.lat.toFixed(6)},${sa.lng.toFixed(6)})`);
    const rb = planRoute(gb, o, k, k.name, 'drive')!;
    const ra = planRoute(ga, o, k, k.name, 'drive')!;
    lines.push(`  to ${k.name}: old ${rb.distanceM.toFixed(0)} m / ${(rb.durationS / 60).toFixed(1)} min; new ${ra.distanceM.toFixed(0)} m / ${(ra.durationS / 60).toFixed(1)} min`);
    lines.push('  old steps: ' + rb.steps.slice(0, 5).map((s) => instructionFor(s, k.name) + '@' + Math.round(s.startDist)).join(' | '));
    lines.push('  new steps: ' + ra.steps.slice(0, 5).map((s) => instructionFor(s, k.name) + '@' + Math.round(s.startDist)).join(' | '));
    lines.push('  old legs: ' + rb.legs.slice(0, 6).map((l) => `e${l.edge}[${l.from.toFixed(0)}->${l.to.toFixed(0)}]`).join(' '));
    lines.push('  new legs: ' + ra.legs.slice(0, 6).map((l) => `e${l.edge}[${l.from.toFixed(0)}->${l.to.toFixed(0)}]`).join(' '));
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
});
