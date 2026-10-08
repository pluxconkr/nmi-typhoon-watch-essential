/**
 * A navigation session: plans the route on the first GPS fix, follows progress on every fix, re-plans after
 * three fixes in a row clearly off the route, and declares arrival. Plain object with a subscribe/snapshot
 * pair so the full-screen view can read it with useSyncExternalStore; no React, no network.
 */
import { ISLAND_NAME, haversineKm, islandAt, type IslandId, type LatLng } from '@/domain/geo';
import type { RoadGraph, TravelMode } from '@/domain/roads';
import { type Destination, type Route, type RouteProgress, planRoute, routeToNearest, trackRoute } from '@/domain/routing';

export type NavStatus = 'locating' | 'navigating' | 'arrived' | 'off-island' | 'other-island' | 'no-route';

/** Where to go: a fixed place, or whichever of several places is fastest to reach on your island. */
export type NavRequest = { kind: 'place'; place: Destination & { island: IslandId } } | { kind: 'nearest'; places: (Destination & { island: IslandId })[]; label: string };

/** A GPS fix (or demo position) as the session sees it. */
export type NavFix = LatLng & { accuracyM?: number | null; heading?: number | null; at?: number; demo?: unknown };

export interface NavSnapshot {
  status: NavStatus;
  /** The last fix navigation used (fixes saved before it started are ignored). */
  fix: NavFix | null;
  mode: TravelMode;
  target: (Destination & { island: IslandId }) | null;
  route: Route | null;
  progress: RouteProgress | null;
  /** How many times the route was re-planned because you left it. */
  reroutes: number;
  /** For 'other-island': the island the destination is on. */
  targetIsland: IslandId | null;
}

/** Fixes this far from the route (or 1.5 × GPS accuracy, if larger) count as off-route. */
const OFF_ROUTE_M = 35;
const OFF_ROUTE_FIXES = 3;
/** Within this distance of the road end, or of the destination itself, you have arrived. */
const ARRIVE_ROAD_M = 20;
const ARRIVE_PLACE_M = 30;
/** A fix this much older than the session is a saved one from earlier, not where you are now. */
const FRESH_MS = 10 * 60_000;

export class NavSession {
  private snap: NavSnapshot;
  private listeners = new Set<() => void>();
  private offCount = 0;
  /** The fix has been on the current route (until then, the gap from where you started to the road is expected). */
  private joined = false;
  private lastFix: NavFix | null = null;

  constructor(
    private readonly request: NavRequest,
    mode: TravelMode,
    private readonly graphFor: (island: IslandId) => RoadGraph,
    private readonly startedAt = Date.now(),
  ) {
    this.snap = { status: 'locating', fix: null, mode, target: request.kind === 'place' ? request.place : null, route: null, progress: null, reroutes: 0, targetIsland: null };
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getSnapshot = () => this.snap;

  private set(patch: Partial<NavSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const l of this.listeners) l();
  }

  /** Switch between driving and walking; re-plans from the last fix. */
  setMode(mode: TravelMode) {
    if (mode === this.snap.mode) return;
    this.set({ mode, route: null, progress: null, status: 'locating' });
    if (this.lastFix) this.update(this.lastFix);
  }

  /** Feed a GPS fix (or a demo position). */
  update(fix: NavFix | null) {
    if (!fix || this.snap.status === 'arrived') return;
    // A position saved earlier (yesterday, or before GPS was turned off) would plan from the wrong place.
    if (!fix.demo && fix.at !== undefined && fix.at < this.startedAt - FRESH_MS) return;
    this.lastFix = fix;
    this.snap = { ...this.snap, fix };
    const island = islandAt(fix);
    if (!island) {
      this.set({ status: 'off-island', route: null, progress: null });
      return;
    }
    // Not navigating yet, or now on another island than the route (a flight or ferry): plan from here.
    if (!this.snap.route || this.snap.status !== 'navigating' || island !== this.snap.target?.island) {
      this.plan(fix, island);
      return;
    }
    const g = this.graphFor(island);
    const progress = trackRoute(this.snap.route, fix, g.kx, this.snap.progress?.along ?? 0);
    const target = this.snap.target;
    const limit = Math.max(OFF_ROUTE_M, (fix.accuracyM ?? 0) * 1.5);
    // The road end counts only when you are on the route: a fix far away projects onto its last point too.
    if ((progress.remainingM < ARRIVE_ROAD_M && progress.offRouteM <= limit) || haversineKm(fix, target) * 1000 < ARRIVE_PLACE_M) {
      this.set({ status: 'arrived', progress });
      return;
    }
    if (progress.offRouteM <= limit) this.joined = true;
    // Starting from a house or yard off the mapped roads, the gap to the route's start is not a wrong turn.
    const offLimit = this.joined ? limit : Math.max(limit, this.snap.route.start.distM + OFF_ROUTE_M);
    this.offCount = progress.offRouteM > offLimit ? this.offCount + 1 : 0;
    if (this.offCount >= OFF_ROUTE_FIXES) {
      this.offCount = 0;
      const next = this.routeFrom(fix, island);
      if (next) {
        this.joined = false;
        this.set({ ...next, progress: trackRoute(next.route, fix, g.kx), reroutes: this.snap.reroutes + 1 });
        return;
      }
    }
    this.set({ progress });
  }

  /** The route from here: to the place asked for, or to whichever place is now nearest (you may have moved). */
  private routeFrom(fix: LatLng, island: IslandId): { target: Destination & { island: IslandId }; route: Route } | null {
    const g = this.graphFor(island);
    if (this.request.kind === 'nearest') {
      const places = this.request.places.filter((p) => p.island === island);
      const found = places.length ? routeToNearest(g, fix, places, this.snap.mode) : null;
      return found ? { target: places.find((p) => p.id === found.target.id)!, route: found.route } : null;
    }
    const target = this.request.place;
    const route = target.island === island ? planRoute(g, fix, target, target.name, this.snap.mode) : null;
    return route ? { target, route } : null;
  }

  private plan(fix: LatLng, island: IslandId) {
    this.joined = false;
    if (this.request.kind === 'place' && this.request.place.island !== island) {
      this.set({ status: 'other-island', targetIsland: this.request.place.island, route: null, progress: null });
      return;
    }
    const found = this.routeFrom(fix, island);
    if (!found) {
      this.set({ status: 'no-route', route: null, progress: null });
      return;
    }
    this.set({ status: 'navigating', ...found, progress: trackRoute(found.route, fix, this.graphFor(island).kx) });
  }
}

/** "On Tinian" style words for messages. */
export function islandWords(island: IslandId | null): string {
  return island ? ISLAND_NAME[island] : 'another island';
}
