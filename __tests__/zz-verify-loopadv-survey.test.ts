import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, edgeUsable, edgeClass } from '@/domain/roads';

test('survey loops', () => {
  const lines: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    let loops = 0, oneway = 0, onewayDriveUsable = 0, walkUsable = 0;
    for (let e = 0; e < g.edgeCount; e++) {
      if (g.edgeFrom[e] !== g.edgeTo[e]) continue;
      loops++;
      const rev = edgeReversible(g, e, 'drive');
      if (!rev) oneway++;
      if (!rev && edgeUsable(g, e, 'drive')) onewayDriveUsable++;
      if (edgeUsable(g, e, 'walk')) walkUsable++;
      lines.push(`${island} e${e} node=${g.edgeFrom[e]} len=${g.edgeLen[e].toFixed(1)} oneway=${!rev} driveUsable=${edgeUsable(g, e, 'drive')} walkUsable=${edgeUsable(g, e, 'walk')} cls=${edgeClass(g, e)} name=${edgeNameOf(g, e)} deg=${g.adjStart[g.edgeFrom[e] + 1] - g.adjStart[g.edgeFrom[e]]} pts=${g.geomCount[e]}`);
    }
    lines.push(`${island}: edges=${g.edgeCount} loops=${loops} oneway=${oneway} onewayDriveUsable=${onewayDriveUsable} walkUsable=${walkUsable}`);
  }
  console.log(lines.join('\n'));
});
