import { roadGraph } from '@/data/roads';
import { edgeReversible, edgeUsable, edgeClass } from '@/domain/roads';

test('explore one-way structure', () => {
  const out: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    let oneWay = 0, oneWayLoops = 0, twoWayLoops = 0;
    const loops: number[] = [];
    for (let e = 0; e < g.edgeCount; e++) {
      if (!edgeUsable(g, e, 'drive')) continue;
      const rev = edgeReversible(g, e, 'drive');
      if (!rev) oneWay++;
      if (g.edgeFrom[e] === g.edgeTo[e]) {
        if (!rev) { oneWayLoops++; loops.push(e); } else twoWayLoops++;
      }
    }
    out.push(`${island}: nodes=${g.nodeCount} edges=${g.edgeCount} usableOneWay=${oneWay} oneWayLoops=${oneWayLoops} [${loops.join(',')}] twoWayLoops=${twoWayLoops}`);
    for (const e of loops) {
      const n = g.edgeFrom[e];
      out.push(`  loop e${e}: node ${n} (${g.nodeLat[n]}, ${g.nodeLng[n]}) len=${g.edgeLen[e].toFixed(1)} class=${edgeClass(g, e)} name=${g.names[g.edgeName[e]] ?? null} deg=${g.adjStart[n + 1] - g.adjStart[n]}`);
    }
  }
  console.log(out.join('\n'));
});
