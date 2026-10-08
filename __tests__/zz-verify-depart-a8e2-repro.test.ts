import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

function show(label: string, island: 'saipan' | 'tinian' | 'rota', from: { lat: number; lng: number }, to: { lat: number; lng: number; name: string }, mode: 'drive' | 'walk') {
  const g = roadGraph(island);
  const sp = snapToRoad(g, from, mode, 500)!;
  const r = planRoute(g, from, to, to.name, mode)!;
  const L0 = Math.abs(r.legs[0].to - r.legs[0].from);
  console.log(
    label,
    JSON.stringify(from),
    `snap=${edgeNameOf(g, sp.edge)} off-by-from=${sp.offset} off-by-to=${g.edgeLen[sp.edge] - sp.offset} snapDist=${sp.distM.toFixed(2)}`,
    `\n   firstLegLen=${L0}`,
    `legs=${r.legs.slice(0, 3).map((l) => `${edgeNameOf(g, l.edge)}(${Math.abs(l.to - l.from).toFixed(3)}m)`).join(' > ')}`,
    `\n   steps=`,
    r.steps.slice(0, 3).map((s) => `${instructionFor(s, to.name)} @${s.startDist.toFixed(1)}`).join(' | '),
  );
}

test('literal repro inputs', () => {
  const k = byId('kagman-high-school');
  // Literal quantised coordinates of node 67 (typed, not computed)
  show('N67 typed literal', 'saipan', { lat: 15.26627, lng: 145.79056 }, k, 'drive');
  show('N67 computed double', 'saipan', { lat: 15.266269999999999, lng: 145.79056 }, k, 'drive');
  show('GPS-like 3m off (Ironwood)', 'saipan', { lat: 15.168461, lng: 145.78276 }, k, 'drive');
  show('GPS-like unnamed (Walking Place)', 'saipan', { lat: 15.143867, lng: 145.73451 }, k, 'drive');
  show('GPS-like Texas Road', 'saipan', { lat: 15.157823, lng: 145.7109 }, k, 'drive');
  // The neighbourhood of Ironwood: nudge the fix by 1e-6 deg (~0.1m) in each direction
  console.log('--- neighbourhood of Ironwood fix ---');
  const out: Record<string, number> = {};
  const g = roadGraph('saipan');
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      const p = { lat: 15.168461 + i * 1e-6, lng: 145.78276 + j * 1e-6 };
      const r = planRoute(g, p, k, k.name, 'drive')!;
      const key = instructionFor(r.steps[0], k.name) + ' / next: ' + instructionFor(r.steps[1], k.name) + ' @' + (r.steps[1].startDist < 1 ? '~0' : r.steps[1].startDist.toFixed(0));
      out[key] = (out[key] ?? 0) + 1;
    }
  }
  console.log(JSON.stringify(out, null, 1));
});
