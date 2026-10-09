/** Temporary verification file (jog fix): synthetic networks through the real decoder and planner. Deleted after the run. */
import { decodeRoadGraph, type RoadGraphData } from '@/domain/roads';
import { instructionFor, planRoute } from '@/domain/routing';

const LAT0 = 15.0;
const LNG0 = 145.0;
const Q = 1e-5;
const kx = Math.cos((LAT0 * Math.PI) / 180);
const mLat = 111320;
type XY = [number, number];
const toQ = ([x, y]: XY): [number, number] => [Math.round(y / mLat / Q), Math.round(x / (mLat * kx) / Q)];
const ll = ([x, y]: XY) => ({ lat: LAT0 + y / mLat, lng: LNG0 + x / (mLat * kx) });

function build(names: string[], nodes: XY[], edges: { a: number; b: number; name: string; oneway?: boolean }[]) {
  const data: RoadGraphData = {
    v: 1, island: 'saipan', attribution: 'synthetic', source: 'synthetic', osmBase: null, q: Q, origin: [LAT0, LNG0], names,
    nodes: nodes.flatMap(toQ), edges: edges.flatMap((e) => [e.a, e.b, 2 | (e.oneway ? 8 : 0) | 64 | 128, names.indexOf(e.name), 0]), pts: [],
  };
  return decodeRoadGraph(data, 'saipan');
}
const says = (g: ReturnType<typeof build>, from: XY, to: XY) => {
  const r = planRoute(g, ll(from), ll(to), 'Dest', 'drive')!;
  return r.steps.slice(1, -1).map((s) => instructionFor(s, 'Dest')).join(' | ') || '(none)';
};

describe('synthetic jogs', () => {
  test('A leaves straight-on road B to the right at theta, bends back left at a junction 41 m later', () => {
    const rows: string[] = [];
    for (const th of [40, 45, 50, 54, 55, 56, 60, 90]) {
      const t = (th * Math.PI) / 180;
      const P1: XY = [41 * Math.cos(t), -41 * Math.sin(t)];
      const g = build(['B', 'A', 'C'], [[-200, 0], [0, 0], [350, 0], P1, [P1[0] + 250, P1[1]], [P1[0], P1[1] - 60]], [
        { a: 0, b: 1, name: 'B' }, { a: 1, b: 2, name: 'B' }, { a: 1, b: 3, name: 'A' }, { a: 3, b: 4, name: 'A' }, { a: 3, b: 5, name: 'C' },
      ]);
      rows.push(`theta=${th}: ${says(g, [-100, 0], [P1[0] + 100, P1[1]])}`);
    }
    console.log(rows.join('\n'));
    expect(rows[3]).toMatch(/Continue onto A/); // 54 deg: bug persists
    expect(rows[5]).toMatch(/Turn right onto A \| Turn left to stay on A/); // 56 deg: fixed
  });

  test('a median U-turn through a 14 m crossover (left then left) still merges into one maneuver', () => {
    const g = build(['X', 'S'], [[-150, 0], [0, 0], [150, 0], [-150, 14], [0, 14], [150, 14]], [
      { a: 0, b: 1, name: 'X', oneway: true }, { a: 1, b: 2, name: 'X', oneway: true }, { a: 5, b: 4, name: 'X', oneway: true }, { a: 4, b: 3, name: 'X', oneway: true }, { a: 1, b: 4, name: 'S' },
    ]);
    const s = says(g, [-120, 0], [-120, 14]);
    console.log('U-turn:', s);
    expect(s).toBe('Make a U-turn');
  });
});
