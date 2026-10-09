import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf } from '@/domain/roads';
import { planRoute as planCur } from '@/domain/routing';
import { planRoute as planTol } from './zz-verify-depart-a8e2-tolcopy.test';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

test('tolerance variant vs current across all node fixes', () => {
  const rows: string[] = [];
  for (const island of ['saipan', 'tinian'] as const) {
    const g = roadGraph(island);
    const dest = list.filter((s) => s.island === island)[0];
    for (const mode of ['drive', 'walk'] as const) {
      let routes = 0, curBad = 0, tolBad = 0, curSpur = 0, tolSpur = 0, geomDiff = 0;
      for (let i = 0; i < g.nodeCount; i++) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        const rc = planCur(g, from, dest, dest.name, mode);
        const rt = planTol(g, from, dest, dest.name, mode);
        if (!rc || !rt) continue;
        routes++;
        const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
        const trueRoad = (r: typeof rc) => edgeNameOf(g, (r.legs.find((l) => len(l) >= 1) ?? r.legs[0]).edge);
        if (rc.steps[0].road !== trueRoad(rc)) curBad++;
        if (rt.steps[0].road !== trueRoad(rt)) tolBad++;
        if (rc.steps[1] && rc.steps[1].maneuver !== 'arrive' && rc.steps[1].startDist < 1e-3) curSpur++;
        if (rt.steps[1] && rt.steps[1].maneuver !== 'arrive' && rt.steps[1].startDist < 1e-3) tolSpur++;
        if (JSON.stringify(rc.legs) !== JSON.stringify(rt.legs)) geomDiff++;
      }
      rows.push(`${island} ${mode}: routes=${routes} current: wrongDepartRoad=${curBad} spuriousStep=${curSpur} | tolerance variant: wrongDepartRoad=${tolBad} spuriousStep=${tolSpur} | legsDiffer=${geomDiff}`);
    }
  }
  console.log(rows.join('\n'));
});
