/**
 * Offline routing over the bundled road graph: fastest route (Dijkstra on travel time), ranking of
 * several destinations by road, turn-by-turn steps, and progress along a route from GPS fixes.
 * Pure functions, no I/O. Islands are small (≤ 6k intersections), so a full search takes milliseconds.
 */
import type { LatLng } from '@/domain/geo';
import {
  type RoadGraph,
  type RoadPoint,
  type TravelMode,
  edgeNameOf,
  edgeReversible,
  edgeSlice,
  edgeSpeed,
  edgeUsable,
  metresBetween,
  snapToRoad,
} from '@/domain/roads';

// ---------- Search ----------

class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size() {
    return this.keys.length;
  }
  push(key: number, val: number) {
    const k = this.keys;
    const v = this.vals;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  /** Removes the minimum; returns [key, val]. */
  pop(): [number, number] {
    const k = this.keys;
    const v = this.vals;
    const topK = k[0];
    const topV = v[0];
    const lastK = k.pop()!;
    const lastV = v.pop()!;
    const n = k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && k[r] < k[l] ? r : l;
        if (k[c] >= lastK) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lastK;
      v[i] = lastV;
    }
    return [topK, topV];
  }
}

/** Fastest-path tree from a road point: travel time and distance to every node, and the edge used to arrive. */
interface SearchTree {
  start: RoadPoint;
  mode: TravelMode;
  time: Float64Array;
  dist: Float64Array;
  /** Edge used to reach each node; -1 for the two seed nodes (reached along the start edge) and unreached nodes. */
  via: Int32Array;
}

function searchFrom(g: RoadGraph, start: RoadPoint, mode: TravelMode): SearchTree {
  const time = new Float64Array(g.nodeCount).fill(Infinity);
  const dist = new Float64Array(g.nodeCount).fill(Infinity);
  const via = new Int32Array(g.nodeCount).fill(-1);
  const heap = new MinHeap();
  const e0 = start.edge;
  const v0 = edgeSpeed(g, e0, mode);
  const seed = (node: number, d: number) => {
    const t = d / v0;
    if (t < time[node]) {
      time[node] = t;
      dist[node] = d;
      heap.push(t, node);
    }
  };
  seed(g.edgeTo[e0], g.edgeLen[e0] - start.offset);
  if (edgeReversible(g, e0, mode)) seed(g.edgeFrom[e0], start.offset);
  // Snapped onto the junction at the start of a one-way edge: you are at that junction, free to take any road.
  else if (start.offset === 0) seed(g.edgeFrom[e0], 0);

  while (heap.size > 0) {
    const [t, u] = heap.pop();
    if (t > time[u]) continue;
    for (let i = g.adjStart[u]; i < g.adjStart[u + 1]; i++) {
      const e = g.adjEdges[i];
      if (!edgeUsable(g, e, mode)) continue;
      const forward = g.edgeFrom[e] === u;
      if (!forward && !edgeReversible(g, e, mode)) continue;
      const w = forward ? g.edgeTo[e] : g.edgeFrom[e];
      const nt = t + g.edgeLen[e] / edgeSpeed(g, e, mode);
      if (nt < time[w]) {
        time[w] = nt;
        dist[w] = dist[u] + g.edgeLen[e];
        via[w] = e;
        heap.push(nt, w);
      }
    }
  }
  return { start, mode, time, dist, via };
}

/** How the best path enters the destination edge. */
interface Arrival {
  timeS: number;
  distM: number;
  /** 'from' = arrive at the edge's from-node then travel forward; 'to' = from its to-node backward; 'direct' = same edge as the start. */
  via: 'from' | 'to' | 'direct';
}

function arrivalAt(g: RoadGraph, tree: SearchTree, end: RoadPoint): Arrival | null {
  const e = end.edge;
  const v = edgeSpeed(g, e, tree.mode);
  let best: Arrival | null = null;
  const consider = (a: Arrival) => {
    if (Number.isFinite(a.timeS) && (!best || a.timeS < best.timeS)) best = a;
  };
  const a = g.edgeFrom[e];
  const b = g.edgeTo[e];
  consider({ timeS: tree.time[a] + end.offset / v, distM: tree.dist[a] + end.offset, via: 'from' });
  if (edgeReversible(g, e, tree.mode)) consider({ timeS: tree.time[b] + (g.edgeLen[e] - end.offset) / v, distM: tree.dist[b] + g.edgeLen[e] - end.offset, via: 'to' });
  if (e === tree.start.edge) {
    const d = end.offset - tree.start.offset;
    if (d >= 0 || edgeReversible(g, e, tree.mode)) consider({ timeS: Math.abs(d) / v, distM: Math.abs(d), via: 'direct' });
  }
  return best;
}

// ---------- Routes ----------

export type Maneuver = 'depart' | 'continue' | 'slight' | 'turn' | 'sharp' | 'uturn' | 'arrive';

export interface Step {
  maneuver: Maneuver;
  /** 'left' / 'right' for slight, turn and sharp; the side of the destination for arrive. */
  side: 'left' | 'right' | null;
  /** Road you are on after this maneuver (null = unnamed). */
  road: string | null;
  /** Same road as before the maneuver ("turn left to stay on …"). */
  stayOn: boolean;
  /** Metres from the route start where this maneuver happens. */
  startDist: number;
  /** Metres from the route start where the next maneuver happens. */
  endDist: number;
  lat: number;
  lng: number;
  /** Compass word for depart steps ("north"). */
  heading: string | null;
}

export interface Route {
  mode: TravelMode;
  /** The road-graph edges driven or walked, in order: metres along each edge from → to. */
  legs: { edge: number; from: number; to: number }[];
  /** Polyline along roads from the start road point to the end road point. */
  lat: number[];
  lng: number[];
  /** Cumulative metres and seconds at each polyline point. */
  cumDist: number[];
  cumTime: number[];
  distanceM: number;
  durationS: number;
  steps: Step[];
  start: RoadPoint;
  end: RoadPoint;
  /** Where you are actually going (shelter entrance, store); may be off the road. */
  destination: LatLng;
  destinationName: string;
}

interface Leg {
  edge: number;
  from: number;
  to: number;
  /** Graph node where this leg starts (null for the first leg, which starts mid-edge). */
  startNode: number | null;
}

function legsFor(g: RoadGraph, tree: SearchTree, end: RoadPoint, arrival: Arrival): Leg[] {
  const s = tree.start;
  if (arrival.via === 'direct') return [{ edge: s.edge, from: s.offset, to: end.offset, startNode: null }];
  const ee = end.edge;
  const entryNode = arrival.via === 'from' ? g.edgeFrom[ee] : g.edgeTo[ee];
  const legs: Leg[] = [{ edge: ee, from: arrival.via === 'from' ? 0 : g.edgeLen[ee], to: end.offset, startNode: entryNode }];
  let u = entryNode;
  while (tree.via[u] !== -1) {
    const e = tree.via[u];
    const forward = g.edgeTo[e] === u;
    const prev = forward ? g.edgeFrom[e] : g.edgeTo[e];
    legs.push({ edge: e, from: forward ? 0 : g.edgeLen[e], to: forward ? g.edgeLen[e] : 0, startNode: prev });
    u = prev;
  }
  // u is a seed node reached along the start edge. On a loop (from = to), go back only if the edge allows it.
  const toFrom = u === g.edgeFrom[s.edge] && (u !== g.edgeTo[s.edge] || (edgeReversible(g, s.edge, tree.mode) && s.offset < g.edgeLen[s.edge] / 2));
  legs.push({ edge: s.edge, from: s.offset, to: toFrom ? 0 : g.edgeLen[s.edge], startNode: null });
  return legs.reverse();
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

function bearing(aLat: number, aLng: number, bLat: number, bLng: number, kx: number): number {
  const dx = (bLng - aLng) * kx;
  const dy = bLat - aLat;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

function turnAngle(inB: number, outB: number): number {
  let a = outB - inB;
  while (a > 180) a -= 360;
  while (a <= -180) a += 360;
  return a;
}

/** Point at `d` metres along a polyline with cumulative distances. */
function pointAt(lat: number[], lng: number[], cum: number[], d: number): [number, number] {
  const x = Math.max(0, Math.min(cum[cum.length - 1], d));
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= x) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo];
  const t = span === 0 ? 0 : (x - cum[lo]) / span;
  return [lat[lo] + t * (lat[hi] - lat[lo]), lng[lo] + t * (lng[hi] - lng[lo])];
}

function usableDegree(g: RoadGraph, node: number, mode: TravelMode): number {
  let n = 0;
  for (let i = g.adjStart[node]; i < g.adjStart[node + 1]; i++) if (edgeUsable(g, g.adjEdges[i], mode)) n++;
  return n;
}

const PROBE_M = 20;
/** Two maneuvers this close become one (a tiny connector between them). */
const MERGE_ANY_M = 15;
/** …or this close when the second just keeps you on the road the first turned onto (crossing a divided road). */
const MERGE_SAME_ROAD_M = 60;

function isTurn(s: Step): boolean {
  return s.maneuver === 'turn' || s.maneuver === 'sharp';
}

function classify(angle: number): { maneuver: Maneuver; side: 'left' | 'right' | null } {
  const a = Math.abs(angle);
  const side = angle > 0 ? 'right' : 'left';
  if (a < 25) return { maneuver: 'continue', side: null };
  if (a < 55) return { maneuver: 'slight', side };
  if (a < 135) return { maneuver: 'turn', side };
  if (a < 170) return { maneuver: 'sharp', side };
  return { maneuver: 'uturn', side: null };
}

function buildRoute(g: RoadGraph, tree: SearchTree, end: RoadPoint, arrival: Arrival, destination: LatLng, destinationName: string): Route {
  const legs = legsFor(g, tree, end, arrival);
  const lat: number[] = [];
  const lng: number[] = [];
  const cumDist: number[] = [];
  const cumTime: number[] = [];
  const legStart: number[] = [];
  for (const leg of legs) {
    const pts = edgeSlice(g, leg.edge, leg.from, leg.to);
    const v = edgeSpeed(g, leg.edge, tree.mode);
    legStart.push(cumDist.length ? cumDist[cumDist.length - 1] : 0);
    pts.forEach(([pLat, pLng], i) => {
      if (lat.length === 0) {
        lat.push(pLat);
        lng.push(pLng);
        cumDist.push(0);
        cumTime.push(0);
        return;
      }
      if (i === 0) return; // joint point already present
      const d = metresBetween(lat[lat.length - 1], lng[lng.length - 1], pLat, pLng, g.kx);
      lat.push(pLat);
      lng.push(pLng);
      cumDist.push(cumDist[cumDist.length - 1] + d);
      cumTime.push(cumTime[cumTime.length - 1] + d / v);
    });
  }
  const total = cumDist[cumDist.length - 1];
  const at = (d: number) => pointAt(lat, lng, cumDist, d);
  const bearingBetween = (d0: number, d1: number) => {
    const [aLat, aLng] = at(d0);
    const [bLat, bLng] = at(d1);
    return bearing(aLat, aLng, bLat, bLng, g.kx);
  };

  const [sLat, sLng] = at(0);
  const steps: Step[] = [
    {
      maneuver: 'depart',
      side: null,
      road: edgeNameOf(g, legs[0].edge),
      stayOn: false,
      startDist: 0,
      endDist: total,
      lat: sLat,
      lng: sLng,
      heading: total > 0 ? COMPASS[Math.round(bearingBetween(0, Math.min(total, 30)) / 45) % 8] : null,
    },
  ];
  for (let i = 1; i < legs.length; i++) {
    const node = legs[i].startNode;
    const d = legStart[i];
    if (node === null || d <= 0 || d >= total) continue;
    const road = edgeNameOf(g, legs[i].edge);
    const current = steps[steps.length - 1].road;
    const angle = turnAngle(bearingBetween(Math.max(0, d - PROBE_M), d), bearingBetween(d, Math.min(total, d + PROBE_M)));
    const { maneuver, side } = classify(angle);
    const isJunction = usableDegree(g, node, tree.mode) >= 3;
    const renamed = road !== current;
    let add = false;
    if (!isJunction) add = renamed && road !== null && current !== null;
    else add = renamed || Math.abs(angle) >= 40;
    // "Continue straight" onto an unnamed road tells the driver nothing.
    if (maneuver === 'continue' && road === null) add = false;
    if (!add) continue;
    const [mLat, mLng] = at(d);
    steps.push({ maneuver, side, road, stayOn: !renamed, startDist: d, endDist: total, lat: mLat, lng: mLng, heading: null });
  }
  // Collapse double maneuvers that a driver experiences as one turn.
  for (let i = 1; i < steps.length - 1; ) {
    const a = steps[i];
    const b = steps[i + 1];
    const gap = b.startDist - a.startDist;
    // Right then left (or left then right) is a jog: both turns matter, even where they are close together.
    const jog = a.side !== null && b.side !== null && a.side !== b.side && (isTurn(a) || isTurn(b));
    if (jog || (gap >= MERGE_ANY_M && !(gap < MERGE_SAME_ROAD_M && b.road !== null && b.road === a.road))) {
      i++;
      continue;
    }
    const angle = turnAngle(bearingBetween(Math.max(0, a.startDist - PROBE_M), a.startDist), bearingBetween(b.startDist, Math.min(total, b.startDist + PROBE_M)));
    const { maneuver, side } = classify(angle);
    const stayOn = b.road === steps[i - 1].road;
    if (maneuver === 'continue' && stayOn) steps.splice(i, 2);
    else steps.splice(i, 2, { ...a, maneuver, side, road: b.road, stayOn });
  }
  // Arrival: which side of the road the destination is on, when it is clearly off the road.
  const offRoad = metresBetween(end.lat, end.lng, destination.lat, destination.lng, g.kx);
  let arriveSide: 'left' | 'right' | null = null;
  if (offRoad > 15 && total > 5) {
    const a = turnAngle(bearingBetween(Math.max(0, total - PROBE_M), total), bearing(end.lat, end.lng, destination.lat, destination.lng, g.kx));
    if (Math.abs(a) > 20 && Math.abs(a) < 160) arriveSide = a > 0 ? 'right' : 'left';
  }
  steps.push({ maneuver: 'arrive', side: arriveSide, road: null, stayOn: false, startDist: total, endDist: total, lat: end.lat, lng: end.lng, heading: null });
  for (let i = 0; i < steps.length - 1; i++) steps[i].endDist = steps[i + 1].startDist;

  return {
    mode: tree.mode,
    legs: legs.map(({ edge, from, to }) => ({ edge, from, to })),
    lat,
    lng,
    cumDist,
    cumTime,
    distanceM: total,
    durationS: cumTime[cumTime.length - 1],
    steps,
    start: tree.start,
    end,
    destination,
    destinationName,
  };
}

/** Largest gap (metres) between a position and the road network for it to count as "on the road network". */
export const SNAP_LIMIT_M = 500;

/** Fastest route between two positions on the same island, or null when either is too far from a road or unreachable. */
export function planRoute(g: RoadGraph, from: LatLng, to: LatLng, toName: string, mode: TravelMode): Route | null {
  const start = snapToRoad(g, from, mode, SNAP_LIMIT_M);
  const end = snapToRoad(g, to, mode, SNAP_LIMIT_M);
  if (!start || !end) return null;
  const tree = searchFrom(g, start, mode);
  const arrival = arrivalAt(g, tree, end);
  return arrival ? buildRoute(g, tree, end, arrival, to, toName) : null;
}

export interface Destination {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Reach {
  id: string;
  distanceM: number;
  durationS: number;
}

/** Road distance and travel time from one position to many destinations, fastest first (one search). */
export function reachByRoad(g: RoadGraph, from: LatLng, targets: Destination[], mode: TravelMode): Reach[] {
  const start = snapToRoad(g, from, mode, SNAP_LIMIT_M);
  if (!start) return [];
  const tree = searchFrom(g, start, mode);
  const out: Reach[] = [];
  for (const t of targets) {
    const end = snapToRoad(g, t, mode, SNAP_LIMIT_M);
    if (!end) continue;
    const a = arrivalAt(g, tree, end);
    if (a) out.push({ id: t.id, distanceM: a.distM, durationS: a.timeS });
  }
  return out.sort((x, y) => x.durationS - y.durationS);
}

/** Route to whichever destination is fastest to reach by road. */
export function routeToNearest(g: RoadGraph, from: LatLng, targets: Destination[], mode: TravelMode): { target: Destination; route: Route } | null {
  const start = snapToRoad(g, from, mode, SNAP_LIMIT_M);
  if (!start) return null;
  const tree = searchFrom(g, start, mode);
  let best: { target: Destination; end: RoadPoint; arrival: Arrival } | null = null;
  for (const t of targets) {
    const end = snapToRoad(g, t, mode, SNAP_LIMIT_M);
    if (!end) continue;
    const arrival = arrivalAt(g, tree, end);
    if (arrival && (!best || arrival.timeS < best.arrival.timeS)) best = { target: t, end, arrival };
  }
  if (!best) return null;
  return { target: best.target, route: buildRoute(g, tree, best.end, best.arrival, best.target, best.target.name) };
}

// ---------- Instructions ----------

function onto(road: string | null): string {
  return road ? ` onto ${road}` : '';
}

/** What to say for a step ("Turn left onto Beach Road"). */
export function instructionFor(step: Step, destinationName: string): string {
  const side = step.side ?? '';
  switch (step.maneuver) {
    case 'depart':
      return `Head ${step.heading ?? 'out'}${step.road ? ` on ${step.road}` : ''}`;
    case 'continue':
      return step.road ? `Continue onto ${step.road}` : 'Continue straight';
    case 'slight':
      return step.stayOn && step.road ? `Keep ${side} to stay on ${step.road}` : `Bear ${side}${onto(step.road)}`;
    case 'turn':
      return step.stayOn && step.road ? `Turn ${side} to stay on ${step.road}` : `Turn ${side}${onto(step.road)}`;
    case 'sharp':
      return step.stayOn && step.road ? `Turn sharply ${side} to stay on ${step.road}` : `Turn sharply ${side}${onto(step.road)}`;
    case 'uturn':
      return 'Make a U-turn';
    case 'arrive':
      return step.side ? `Arrive at ${destinationName}, on your ${step.side}` : `Arrive at ${destinationName}`;
  }
}

// ---------- Progress ----------

export interface RouteProgress {
  /** Metres travelled along the route (projection of the fix). */
  along: number;
  /** Distance from the fix to the route line. */
  offRouteM: number;
  /** Index of the step you are on (its maneuver is behind you). */
  stepIndex: number;
  /** Metres to the next maneuver (or to the end). */
  toNextM: number;
  remainingM: number;
  remainingS: number;
}

/**
 * Where a fix is matched when parts of the route run side by side (the two halves of a divided road, a loop):
 * each metre the match would jump from the last position, beyond what can happen between two fixes, counts
 * as this many metres of distance from the route.
 */
const JUMP_SLACK_M = 100;
const JUMP_COST = 0.05;

/** Project a GPS fix onto the route. Pass the last `along` so that a noisy fix is not matched to a far part of the route that runs alongside. */
export function trackRoute(route: Route, fix: LatLng, kx: number, prevAlong = 0): RouteProgress {
  const n = route.lat.length;
  let p = { score: Infinity, d: n < 2 ? metresBetween(fix.lat, fix.lng, route.lat[0], route.lng[0], kx) : Infinity, seg: 0, t: 0 };
  for (let i = 0; i < n - 1; i++) {
    const ax = (route.lng[i] - fix.lng) * kx;
    const ay = route.lat[i] - fix.lat;
    const bx = (route.lng[i + 1] - fix.lng) * kx;
    const by = route.lat[i + 1] - fix.lat;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d = Math.sqrt(px * px + py * py) * 111_320;
    const along = route.cumDist[i] + t * (route.cumDist[i + 1] - route.cumDist[i]);
    const score = d + JUMP_COST * Math.max(0, Math.abs(along - prevAlong) - JUMP_SLACK_M);
    if (score < p.score) p = { score, d, seg: i, t };
  }
  const segLen = n < 2 ? 0 : route.cumDist[p.seg + 1] - route.cumDist[p.seg];
  const along = n < 2 ? 0 : route.cumDist[p.seg] + p.t * segLen;
  const timeAt = n < 2 ? 0 : route.cumTime[p.seg] + p.t * (route.cumTime[p.seg + 1] - route.cumTime[p.seg]);
  let stepIndex = 0;
  for (let i = 0; i < route.steps.length - 1; i++) if (route.steps[i].startDist <= along) stepIndex = i;
  const next = route.steps[stepIndex + 1] ?? null;
  return {
    along,
    offRouteM: p.d,
    stepIndex,
    toNextM: next ? Math.max(0, next.startDist - along) : 0,
    remainingM: Math.max(0, route.distanceM - along),
    remainingS: Math.max(0, route.durationS - timeAt),
  };
}

// ---------- Words for the screen ----------

/** Distance the way navigation says it: "40 m", "350 m", "1.2 km", "13 km". */
export function formatNavDistance(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m < 100) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  if (m < 10_000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

/** "1 min", "18 min", "1 h 5 min". */
export function formatTravelTime(s: number): string {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

test('noop', () => {});
