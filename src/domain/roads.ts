/**
 * Offline road network: decodes the bundled OSM road graph (scripts/build-roads.py) into typed arrays,
 * indexes it on a grid, and snaps positions onto the nearest usable road. Pure functions, no I/O.
 */
import type { IslandId, LatLng } from './geo';

export type TravelMode = 'drive' | 'walk';

/** Raw JSON shape written by scripts/build-roads.py. */
export interface RoadGraphData {
  v: number;
  island: string;
  attribution: string;
  source: string;
  osmBase: string | null;
  q: number;
  origin: number[];
  names: string[];
  nodes: number[];
  edges: number[];
  pts: number[];
}

const EDGE_INTS = 5;
const FLAG_CLASS = 0b111;
const FLAG_ONEWAY = 1 << 3;
const FLAG_DRIVE_MAIN = 1 << 6;
const FLAG_WALK_MAIN = 1 << 7;

/** Road class codes stored in the low three flag bits. */
export const RoadClass = { major: 0, secondary: 1, local: 2, service: 3, track: 4, path: 5 } as const;

/** Typical speeds (km/h) used for travel-time estimates, by road class. Storm conditions are slower. */
const DRIVE_KMH = [55, 45, 30, 15, 10, 5];
const WALK_KMH = 4.8;

const M_PER_DEG = 111_320;
const GRID_DEG = 0.002; // ≈ 220 m cells

export interface RoadGraph {
  island: IslandId;
  names: string[];
  attribution: string;
  nodeCount: number;
  edgeCount: number;
  nodeLat: Float64Array;
  nodeLng: Float64Array;
  edgeFrom: Int32Array;
  edgeTo: Int32Array;
  /** Metres, measured along the stored geometry. */
  edgeLen: Float64Array;
  edgeFlags: Uint8Array;
  edgeName: Int32Array;
  /** Each edge's full polyline (from-node … to-node) as a slice of ptLat/ptLng. */
  geomStart: Int32Array;
  geomCount: Int32Array;
  ptLat: Float64Array;
  ptLng: Float64Array;
  /** Edges touching each node (CSR layout). */
  adjStart: Int32Array;
  adjEdges: Int32Array;
  grid: Map<number, number[]>;
  /** cos(latitude) of the island, for local metric distances. */
  kx: number;
}

/** Local metric distance in metres (equirectangular; accurate to well under 1% across an island). */
export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number, kx: number): number {
  const dy = (bLat - aLat) * M_PER_DEG;
  const dx = (bLng - aLng) * M_PER_DEG * kx;
  return Math.sqrt(dx * dx + dy * dy);
}

const cellKey = (cx: number, cy: number) => cx * 100_000 + cy;

export function decodeRoadGraph(data: RoadGraphData, island: IslandId): RoadGraph {
  const q = data.q;
  const [lat0, lng0] = data.origin;
  const nodeCount = data.nodes.length / 2;
  const edgeCount = data.edges.length / EDGE_INTS;
  const nodeLat = new Float64Array(nodeCount);
  const nodeLng = new Float64Array(nodeCount);
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (let i = 0; i < nodeCount; i++) {
    nodeLat[i] = lat0 + data.nodes[2 * i] * q;
    nodeLng[i] = lng0 + data.nodes[2 * i + 1] * q;
    minLat = Math.min(minLat, nodeLat[i]);
    maxLat = Math.max(maxLat, nodeLat[i]);
  }
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);

  const edgeFrom = new Int32Array(edgeCount);
  const edgeTo = new Int32Array(edgeCount);
  const edgeFlags = new Uint8Array(edgeCount);
  const edgeName = new Int32Array(edgeCount);
  const geomStart = new Int32Array(edgeCount);
  const geomCount = new Int32Array(edgeCount);
  const edgeLen = new Float64Array(edgeCount);
  const totalPts = edgeCount * 2 + data.pts.length / 2;
  const ptLat = new Float64Array(totalPts);
  const ptLng = new Float64Array(totalPts);

  let p = 0; // write cursor into ptLat/ptLng
  let r = 0; // read cursor into data.pts
  for (let e = 0; e < edgeCount; e++) {
    const o = e * EDGE_INTS;
    const a = data.edges[o];
    const b = data.edges[o + 1];
    edgeFrom[e] = a;
    edgeTo[e] = b;
    edgeFlags[e] = data.edges[o + 2];
    edgeName[e] = data.edges[o + 3];
    const interior = data.edges[o + 4];
    geomStart[e] = p;
    geomCount[e] = interior + 2;
    let qa = data.nodes[2 * a];
    let qb = data.nodes[2 * a + 1];
    ptLat[p] = nodeLat[a];
    ptLng[p] = nodeLng[a];
    p++;
    for (let k = 0; k < interior; k++) {
      qa += data.pts[r++];
      qb += data.pts[r++];
      ptLat[p] = lat0 + qa * q;
      ptLng[p] = lng0 + qb * q;
      p++;
    }
    ptLat[p] = nodeLat[b];
    ptLng[p] = nodeLng[b];
    p++;
    let len = 0;
    for (let k = geomStart[e]; k < p - 1; k++) len += metresBetween(ptLat[k], ptLng[k], ptLat[k + 1], ptLng[k + 1], kx);
    edgeLen[e] = len;
  }

  // Adjacency (CSR).
  const degree = new Int32Array(nodeCount);
  for (let e = 0; e < edgeCount; e++) {
    degree[edgeFrom[e]]++;
    degree[edgeTo[e]]++;
  }
  const adjStart = new Int32Array(nodeCount + 1);
  for (let i = 0; i < nodeCount; i++) adjStart[i + 1] = adjStart[i] + degree[i];
  const fill = adjStart.slice(0, nodeCount);
  const adjEdges = new Int32Array(adjStart[nodeCount]);
  for (let e = 0; e < edgeCount; e++) {
    adjEdges[fill[edgeFrom[e]]++] = e;
    adjEdges[fill[edgeTo[e]]++] = e;
  }

  // Grid index of edges by the cells their segments cross.
  const grid = new Map<number, number[]>();
  for (let e = 0; e < edgeCount; e++) {
    const s = geomStart[e];
    for (let k = s; k < s + geomCount[e] - 1; k++) {
      const x0 = Math.floor(Math.min(ptLng[k], ptLng[k + 1]) / GRID_DEG);
      const x1 = Math.floor(Math.max(ptLng[k], ptLng[k + 1]) / GRID_DEG);
      const y0 = Math.floor(Math.min(ptLat[k], ptLat[k + 1]) / GRID_DEG);
      const y1 = Math.floor(Math.max(ptLat[k], ptLat[k + 1]) / GRID_DEG);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const key = cellKey(cx, cy);
          const list = grid.get(key);
          if (!list) grid.set(key, [e]);
          else if (list[list.length - 1] !== e) list.push(e);
        }
      }
    }
  }

  return { island, names: data.names, attribution: data.attribution, nodeCount, edgeCount, nodeLat, nodeLng, edgeFrom, edgeTo, edgeLen, edgeFlags, edgeName, geomStart, geomCount, ptLat, ptLng, adjStart, adjEdges, grid, kx };
}

/** Whether `mode` may use edge `e` at all (it must be part of that mode's main connected network). */
export function edgeUsable(g: RoadGraph, e: number, mode: TravelMode): boolean {
  return (g.edgeFlags[e] & (mode === 'drive' ? FLAG_DRIVE_MAIN : FLAG_WALK_MAIN)) !== 0;
}

/** Whether `mode` may travel edge `e` against its stored direction (to → from). */
export function edgeReversible(g: RoadGraph, e: number, mode: TravelMode): boolean {
  return mode === 'walk' || (g.edgeFlags[e] & FLAG_ONEWAY) === 0;
}

export function edgeClass(g: RoadGraph, e: number): number {
  return g.edgeFlags[e] & FLAG_CLASS;
}

/** Travel speed on edge `e` in metres per second. */
export function edgeSpeed(g: RoadGraph, e: number, mode: TravelMode): number {
  return ((mode === 'walk' ? WALK_KMH : DRIVE_KMH[edgeClass(g, e)]) * 1000) / 3600;
}

/** Fastest speed any edge allows in this mode (for an admissible A* heuristic). */
export function maxSpeed(mode: TravelMode): number {
  return ((mode === 'walk' ? WALK_KMH : DRIVE_KMH[0]) * 1000) / 3600;
}

export function edgeNameOf(g: RoadGraph, e: number): string | null {
  const i = g.edgeName[e];
  return i >= 0 ? g.names[i] : null;
}

/** A position on the road network: edge, distance along it from its from-node, and the point itself. */
export interface RoadPoint {
  edge: number;
  /** Metres from the edge's from-node along its geometry. */
  offset: number;
  lat: number;
  lng: number;
  /** How far the original position is from the road, in metres. */
  distM: number;
}

/** Nearest usable road point within `maxM` metres, or null. */
export function snapToRoad(g: RoadGraph, p: LatLng, mode: TravelMode, maxM = 500): RoadPoint | null {
  const reach = Math.ceil(maxM / (GRID_DEG * M_PER_DEG * g.kx)) + 1;
  const cx0 = Math.floor(p.lng / GRID_DEG);
  const cy0 = Math.floor(p.lat / GRID_DEG);
  const seen = new Set<number>();
  let best: RoadPoint | null = null;
  const sx = M_PER_DEG * g.kx;
  for (let cx = cx0 - reach; cx <= cx0 + reach; cx++) {
    for (let cy = cy0 - reach; cy <= cy0 + reach; cy++) {
      const list = g.grid.get(cellKey(cx, cy));
      if (!list) continue;
      for (const e of list) {
        if (seen.has(e)) continue;
        seen.add(e);
        if (!edgeUsable(g, e, mode)) continue;
        const s = g.geomStart[e];
        let along = 0;
        for (let k = s; k < s + g.geomCount[e] - 1; k++) {
          // Segment in local metres relative to p.
          const ax = (g.ptLng[k] - p.lng) * sx;
          const ay = (g.ptLat[k] - p.lat) * M_PER_DEG;
          const bx = (g.ptLng[k + 1] - p.lng) * sx;
          const by = (g.ptLat[k + 1] - p.lat) * M_PER_DEG;
          const dx = bx - ax;
          const dy = by - ay;
          const segLen = Math.sqrt(dx * dx + dy * dy);
          const t = segLen === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (segLen * segLen)));
          const px = ax + t * dx;
          const py = ay + t * dy;
          const d = Math.sqrt(px * px + py * py);
          if (d <= maxM && (!best || d < best.distM)) {
            best = {
              edge: e,
              offset: Math.min(g.edgeLen[e], along + t * segLen),
              lat: g.ptLat[k] + t * (g.ptLat[k + 1] - g.ptLat[k]),
              lng: g.ptLng[k] + t * (g.ptLng[k + 1] - g.ptLng[k]),
              distM: d,
            };
          }
          along += segLen;
        }
      }
    }
  }
  return best;
}

/**
 * Points of edge `e` between two offsets (metres from its from-node). If `from > to` the slice runs
 * backwards. Both end points are interpolated, so consecutive slices join exactly.
 */
export function edgeSlice(g: RoadGraph, e: number, from: number, to: number): [number, number][] {
  const s = g.geomStart[e];
  const n = g.geomCount[e];
  const cum: number[] = [0];
  for (let k = s; k < s + n - 1; k++) cum.push(cum[cum.length - 1] + metresBetween(g.ptLat[k], g.ptLng[k], g.ptLat[k + 1], g.ptLng[k + 1], g.kx));
  const total = cum[cum.length - 1];
  const at = (d: number): [number, number] => {
    const x = Math.max(0, Math.min(total, d));
    let i = 0;
    while (i < n - 2 && cum[i + 1] < x) i++;
    const span = cum[i + 1] - cum[i];
    const t = span === 0 ? 0 : (x - cum[i]) / span;
    return [g.ptLat[s + i] + t * (g.ptLat[s + i + 1] - g.ptLat[s + i]), g.ptLng[s + i] + t * (g.ptLng[s + i + 1] - g.ptLng[s + i])];
  };
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const out: [number, number][] = [at(lo)];
  for (let i = 1; i < n - 1; i++) if (cum[i] > lo && cum[i] < hi) out.push([g.ptLat[s + i], g.ptLng[s + i]]);
  out.push(at(hi));
  return from <= to ? out : out.reverse();
}
