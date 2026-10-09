import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { NavSession } from '@/services/navigation';
import { haversineKm } from '@/domain/geo';
import { instructionFor, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-session2.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

test('Koblerville -> Genesis wholesale: 300 m gap (d=8400 to d=8700) across the Isa Drive U-turn', () => {
  const target = { id: 'genesis', name: 'Genesis Saipan Wholesale', lat: 15.155339, lng: 145.73919, island: 'saipan' as const };
  const session = new NavSession({ kind: 'place', place: target }, 'drive', roadGraph);
  session.update({ lat: 15.123441, lng: 145.70372, accuracyM: 5 });
  const route = session.getSnapshot().route!;
  log(`route ${route.distanceM.toFixed(0)} m; end road point to destination: ${(haversineKm({ lat: route.end.lat, lng: route.end.lng }, target) * 1000).toFixed(1)} m`);
  route.steps.forEach((s, i) => log(`  step ${i}: ${instructionFor(s, target.name)} @${s.startDist.toFixed(0)}`));
  const g = roadGraph('saipan');
  // one direct function-level repro
  const prev = 8400;
  const fix = pointAlong(route, 8700);
  const t = trackRoute(route, fix, g.kx, prev);
  log(`FUNCTION: trackRoute(route, pointAlong(8700), kx, prevAlong=8400) -> along=${t.along.toFixed(0)} (true 8700) offRouteM=${t.offRouteM.toFixed(1)} remainingM=${t.remainingM.toFixed(0)} (true ${(route.distanceM - 8700).toFixed(0)})`);
  const rows: string[] = [];
  let d = 13;
  for (; d <= 8400; d += 13) session.update({ ...pointAlong(route, d), accuracyM: 5 });
  rows.push(`after normal driving to d=${d - 13}: along=${session.getSnapshot().progress!.along.toFixed(0)}`);
  let n = 0;
  let status = '';
  for (d = 8700; d <= route.distanceM; d += 13) {
    session.update({ ...pointAlong(route, d), accuracyM: 5 });
    const s = session.getSnapshot();
    status = s.status;
    if (n < 2 || n % 30 === 0 || s.status === 'arrived') {
      const p = s.progress!;
      rows.push(`  true d=${d.toFixed(0).padStart(5)} along=${p.along.toFixed(0).padStart(5)} err=${(p.along - d).toFixed(0).padStart(6)} off=${p.offRouteM.toFixed(1).padStart(5)} step=${p.stepIndex} "${instructionFor(route.steps[p.stepIndex + 1], target.name)}" in ${p.toNextM.toFixed(0)} m, remaining ${p.remainingM.toFixed(0)} m (true ${(route.distanceM - d).toFixed(0)}) reroutes=${s.reroutes} status=${s.status}`);
    }
    n++;
    if (s.status === 'arrived') break;
  }
  rows.forEach(log);
  log(`final status: ${status}, last true d=${d.toFixed(0)} of ${route.distanceM.toFixed(0)}`);
  fs.writeFileSync(OUT, lines.join('\n'));
});
