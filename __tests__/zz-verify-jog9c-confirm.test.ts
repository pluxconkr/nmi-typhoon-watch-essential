/** Temporary verification file (jog fix). Deleted after the run. */
import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { decodeRoadGraph, type RoadGraphData } from '@/domain/roads';
import { type Route, instructionFor, planRoute, routeToNearest } from '@/domain/routing';
import { NavSession } from '@/services/navigation';

const text = (r: Route) => r.steps.slice(1, -1).map((s) => `${instructionFor(s, 'Dest')} @${s.startDist.toFixed(0)}`);

describe('jog fix confirmation', () => {
  test('Ammurh Drive (the original bug) is fixed', () => {
    const g = roadGraph('saipan');
    const r = planRoute(g, { lat: 15.240799, lng: 145.758507 }, { lat: 15.241218, lng: 145.760139 }, 'Ammurh Drive', 'drive')!;
    console.log('Ammurh', text(r));
    expect(text(r)).toEqual(['Turn right onto Ammurh Drive @156', 'Turn left to stay on Ammurh Drive @196']);
  });

  test('Hagoi Road: same bug, slight angles (54.5 deg) -> still "Continue onto Hagoi Road" with Texas Road dead ahead', () => {
    const g = roadGraph('saipan');
    const r = planRoute(g, { lat: 15.152439388907364, lng: 145.70539511125892 }, { lat: 15.15178115500682, lng: 145.70508196555403 }, 'Dest', 'drive')!;
    console.log('Hagoi', text(r), r.legs.map((l) => l.edge).join(','));
    expect(text(r)).toContain('Continue onto Hagoi Road @94');
  });

  test('Tinian: San Jose to the Tinian medical-support shelter has two maneuvers 14.5 m apart', () => {
    const g = roadGraph('tinian');
    const to = (shelters.shelters as any[]).find((s) => s.name === 'Tinian Middle School and Tinian High School');
    const r = planRoute(g, { lat: 14.96958, lng: 145.62507 }, to, to.name, 'drive')!;
    console.log('San Jose -> TMS/THS', text(r));
    const gaps = r.steps.slice(2, -1).map((s, i) => s.startDist - r.steps[i + 1].startDist);
    console.log('gaps between consecutive maneuvers', gaps.map((x) => x.toFixed(1)));
    expect(Math.min(...gaps)).toBeLessThan(15);
    // Drive it with 1 Hz fixes at several speeds through the real NavSession, and note which banners are ever shown.
    const place = { id: to.shelterId, name: to.name, lat: to.lat, lng: to.lng, island: 'tinian' as const };
    for (const v of [6, 8.3, 11.1, 13.9, 16.7, 22]) {
      const s = new NavSession({ kind: 'place', place }, 'drive', roadGraph);
      const fixAt = (d: number) => {
        let i = 1;
        while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
        const span = r.cumDist[i] - r.cumDist[i - 1];
        const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
        return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]), accuracyM: 5 };
      };
      s.update(fixAt(0));
      const shown: string[] = [];
      for (let d = 0; d < r.distanceM - 21; d += v) {
        s.update(fixAt(d));
        const snap = s.getSnapshot();
        if (snap.status !== 'navigating' || !snap.progress || !snap.route) break;
        const pr = snap.progress;
        const atStart = pr.stepIndex === 0 && pr.along < 25;
        const step = atStart ? snap.route.steps[0] : snap.route.steps[pr.stepIndex + 1];
        const line = `${instructionFor(step, to.name)} in ${Math.round(atStart ? step.endDist - pr.along : pr.toNextM)} m`;
        if (shown[shown.length - 1]?.split(' in ')[0] !== line.split(' in ')[0]) shown.push(line);
        else shown[shown.length - 1] = line;
      }
      console.log(`speed ${(v * 3.6).toFixed(0)} km/h last banner text per maneuver:`, shown);
    }
    // nearest-medical flow from the San Jose demo village
    const med = (shelters.shelters as any[]).filter((x) => x.island === 'tinian' && x.designation !== 'past' && x.medicalSupport === true);
    const near = routeToNearest(g, { lat: 14.96958, lng: 145.62507 }, med.map((m) => ({ id: m.shelterId, name: m.name, lat: m.lat, lng: m.lng })), 'drive')!;
    console.log('nearest medical from San Jose ->', near.target.name, text(near.route));
  });
});
