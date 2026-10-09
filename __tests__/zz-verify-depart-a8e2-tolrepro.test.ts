import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { planRoute as planCur, instructionFor, trackRoute } from '@/domain/routing';
import { planRoute as planTol } from './zz-verify-depart-a8e2-tolcopy.test';
import { NavSession } from '@/services/navigation';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('repro inputs: current vs tolerance variant, plus the banner the UI would show', () => {
  const g = roadGraph('saipan');
  const k = byId('kagman-high-school');
  const inputs: [string, { lat: number; lng: number }][] = [
    ['node 67 exact (roadGraph("saipan").nodeLat[67], nodeLng[67])', { lat: g.nodeLat[67], lng: g.nodeLng[67] }],
    ['typed 15.26627,145.79056', { lat: 15.26627, lng: 145.79056 }],
    ['GPS-like 15.168461,145.78276', { lat: 15.168461, lng: 145.78276 }],
    ['GPS-like 15.157823,145.7109', { lat: 15.157823, lng: 145.7109 }],
  ];
  for (const [label, p] of inputs) {
    for (const [name, plan] of [['current', planCur], ['tolerance', planTol]] as const) {
      const r = plan(g, p, k, k.name, 'drive')!;
      const pr = trackRoute(r, p, g.kx);
      const atStart = pr.stepIndex === 0 && pr.along < 25 && pr.toNextM >= 50;
      const banner = atStart ? r.steps[0] : r.steps[pr.stepIndex + 1] ?? r.steps[r.steps.length - 1];
      console.log(`${label} [${name}] steps: ${r.steps.slice(0, 3).map((s) => instructionFor(s, k.name) + ' @' + s.startDist.toPrecision(3)).join(' | ')}\n    banner would say: "${instructionFor(banner, k.name)}"`);
    }
  }
  // Through the real NavSession
  const s = new NavSession({ kind: 'place', place: { id: k.shelterId, name: k.name, lat: k.lat, lng: k.lng, island: 'saipan' } }, 'drive', () => g);
  s.update({ lat: g.nodeLat[67], lng: g.nodeLng[67], accuracyM: 5 });
  const snap = s.getSnapshot();
  console.log('NavSession first steps:', snap.route!.steps.slice(0, 2).map((st) => instructionFor(st, k.name)));
});
