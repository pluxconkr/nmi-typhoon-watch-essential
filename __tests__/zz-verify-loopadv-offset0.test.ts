import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, snapToRoad } from '@/domain/roads';
import { planRoute, reachByRoad } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('probe positions near the one-way loop nodes', () => {
  const g = roadGraph('saipan');
  const out: string[] = [];
  for (const L of [3345, 1067]) {
    const N = g.edgeFrom[L];
    out.push(`loop e${L} node ${N} at ${g.nodeLat[N]},${g.nodeLng[N]} len=${g.edgeLen[L].toFixed(2)}`);
    // list edges at the node
    const edgesAt: string[] = [];
    for (let i = g.adjStart[N]; i < g.adjStart[N + 1]; i++) {
      const e = g.adjEdges[i];
      edgesAt.push(`e${e}(${g.edgeFrom[e]}->${g.edgeTo[e]},len=${g.edgeLen[e].toFixed(1)},oneway=${!edgeReversible(g, e, 'drive')},name=${edgeNameOf(g, e)})`);
    }
    out.push('  edges at node: ' + edgesAt.join(' '));
    const exact = snapToRoad(g, { lat: g.nodeLat[N], lng: g.nodeLng[N] }, 'drive');
    out.push(`  exact node snap: edge=${exact?.edge} offset=${exact?.offset} dist=${exact?.distM}`);
    // probe a ring around the node
    const found: string[] = [];
    for (const r of [0.2, 0.5, 1, 2, 4, 8, 15, 30]) {
      for (let a = 0; a < 360; a += 5) {
        const dLat = (r * Math.cos((a * Math.PI) / 180)) / 111320;
        const dLng = (r * Math.sin((a * Math.PI) / 180)) / (111320 * g.kx);
        const p = { lat: g.nodeLat[N] + dLat, lng: g.nodeLng[N] + dLng };
        const s = snapToRoad(g, p, 'drive');
        if (s && s.edge === L && (s.offset === 0 || s.offset === g.edgeLen[L])) {
          found.push(`r=${r} a=${a} offset=${s.offset} (${p.lat},${p.lng})`);
        }
      }
    }
    out.push(`  ring probes snapping to loop end/start: ${found.length}`);
    out.push(...found.slice(0, 6).map((x) => '    ' + x));
  }
  console.log(out.join('\n'));
});
