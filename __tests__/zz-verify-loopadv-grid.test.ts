import { roadGraph } from '@/data/roads';
import { edgeReversible, snapToRoad } from '@/domain/roads';

test('dense grid scan around one-way loop nodes: any non-exact position that snaps to offset 0 / len of the loop?', () => {
  const g = roadGraph('saipan');
  const out: string[] = [];
  for (const L of [1067, 3345]) {
    const N = g.edgeFrom[L];
    // directions of the edge ends at N
    const dirs: string[] = [];
    for (let i = g.adjStart[N]; i < g.adjStart[N + 1]; i++) {
      const e = g.adjEdges[i];
      const s = g.geomStart[e];
      const cnt = g.geomCount[e];
      const pts: [number, number][] = [];
      if (g.edgeFrom[e] === N) pts.push([g.ptLat[s + 1], g.ptLng[s + 1]]);
      if (g.edgeTo[e] === N) pts.push([g.ptLat[s + cnt - 2], g.ptLng[s + cnt - 2]]);
      for (const [la, ln] of pts) {
        const dy = (la - g.nodeLat[N]) * 111320;
        const dx = (ln - g.nodeLng[N]) * 111320 * g.kx;
        dirs.push(`e${e}:${((Math.atan2(dx, dy) * 180) / Math.PI + 360).toFixed(0) % 360}deg`);
      }
    }
    out.push(`loop e${L} node dirs (bearing from N of each edge end): ${dirs.join(' ')}`);
    let hits = 0, total = 0;
    const examples: string[] = [];
    const R = 80;
    for (let dxm = -R; dxm <= R; dxm += 0.5) {
      for (let dym = -R; dym <= R; dym += 0.5) {
        if (dxm === 0 && dym === 0) continue;
        const p = { lat: g.nodeLat[N] + dym / 111320, lng: g.nodeLng[N] + dxm / (111320 * g.kx) };
        const s = snapToRoad(g, p, 'drive');
        total++;
        if (s && s.edge === L && (s.offset === 0 || s.offset === g.edgeLen[L])) {
          hits++;
          if (examples.length < 4) examples.push(`(${dxm},${dym}) offset=${s.offset} dist=${s.distM.toFixed(2)}`);
        }
      }
    }
    out.push(`  scanned ${total} points within ${R} m of N: ${hits} snap to the loop at offset 0/len ${examples.join(' ')}`);
  }
  console.log(out.join('\n'));
});
