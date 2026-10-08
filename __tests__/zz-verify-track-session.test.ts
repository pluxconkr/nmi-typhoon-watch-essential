import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { NavSession } from '@/services/navigation';
import type { Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-session.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

function run(gapFrom: number, gapTo: number) {
  const target = { id: 't', name: 'Destination', lat: 15.014668, lng: 145.635747, island: 'tinian' as const };
  const session = new NavSession({ kind: 'place', place: target }, 'drive', roadGraph);
  session.update({ lat: 15.033935, lng: 145.647902, accuracyM: 5 });
  const route = session.getSnapshot().route!;
  log(`--- gap from d=${gapFrom} to d=${gapTo} (${gapTo - gapFrom} m, no fixes in between). route ${route.distanceM.toFixed(0)} m`);
  const rows: string[] = [];
  const feed = (d: number) => {
    const p = pointAlong(route, d);
    session.update({ ...p, accuracyM: 5 });
    const s = session.getSnapshot();
    return s;
  };
  for (let d = 14; d <= gapFrom; d += 14) feed(d);
  let n = 0;
  for (let d = gapTo; d <= route.distanceM - 30; d += 14) {
    const s = feed(d);
    if (n < 3 || n % 25 === 0) {
      rows.push(`  true d=${d.toFixed(0).padStart(5)}  progress.along=${s.progress!.along.toFixed(0).padStart(5)}  err=${(s.progress!.along - d).toFixed(0).padStart(6)}  offRoute=${s.progress!.offRouteM.toFixed(1).padStart(5)}  step=${s.progress!.stepIndex}  toNext=${s.progress!.toNextM.toFixed(0).padStart(5)}  remaining=${s.progress!.remainingM.toFixed(0).padStart(5)} (true ${(route.distanceM - d).toFixed(0)})  reroutes=${s.reroutes} status=${s.status}`);
    }
    n++;
    if (s.reroutes > 0) {
      rows.push(`  -> re-planned at true d=${d}  (reroutes=${s.reroutes}); user was on the original route the whole time`);
      break;
    }
    if (s.status === 'arrived') { rows.push(`  -> arrived at d=${d}`); break; }
  }
  rows.forEach(log);
}

test('NavSession: what the driver sees after a 500 m GPS gap across the Tinian turnaround', () => {
  run(3575, 4075);
  run(3075, 4075);
  run(2075, 4075);
  fs.writeFileSync(OUT, lines.join('\n'));
});
