/**
 * Derived state hooks: phase, preparation window, checklist rows. Pure derivations over the store
 * plus a slow clock tick so the window/phase advance without user interaction.
 */
import { useEffect, useMemo, useState } from 'react';

import { roadGraph } from '@/data/roads';
import { islandAt, type IslandId } from '@/domain/geo';
import { derivePhase, type PhaseState } from '@/domain/phase';
import type { TravelMode } from '@/domain/roads';
import { reachByRoad, type Reach } from '@/domain/routing';
import { computeChecklist } from '@/domain/rules';
import { hoursBetween } from '@/domain/time';
import type { PrepWindow } from '@/domain/types';
import { windowFor } from '@/domain/windows';
import type { Place } from '@/services/destinations';

import { useAppState } from './appStore';

/** Re-renders every `ms` (default 30 s) so time-based derivations stay fresh. */
export function useClock(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function usePhase(): PhaseState & { now: number; window: PrepWindow | null } {
  const alerts = useAppState((s) => s.alerts);
  const forecast = useAppState((s) => s.forecast);
  const now = useClock();
  return useMemo(() => {
    const p = derivePhase(alerts, now, forecast);
    const window = p.phase === 'before' && p.target ? windowFor(hoursBetween(now, p.target)) : null;
    return { ...p, now, window };
  }, [alerts, forecast, now]);
}

export function useChecklist() {
  const household = useAppState((s) => s.household);
  const state = useAppState((s) => s.checklist);
  const items = useMemo(() => computeChecklist(household), [household]);
  return { household, items, state };
}

/** Distances are recomputed when you move about this far (degrees; ≈ 55 m). */
const REACH_GRID_DEG = 0.0005;

/**
 * Road distance and travel time from your position to each place on the island you are on (one offline search).
 * Empty when there is no position or you are not on Saipan, Tinian or Rota.
 */
export function useRoadReach(places: Place[], mode: TravelMode = 'drive'): { island: IslandId | null; reach: Map<string, Reach> } {
  const location = useAppState((s) => s.location);
  const lat = location ? Math.round(location.lat / REACH_GRID_DEG) * REACH_GRID_DEG : null;
  const lng = location ? Math.round(location.lng / REACH_GRID_DEG) * REACH_GRID_DEG : null;
  return useMemo(() => {
    if (lat === null || lng === null) return { island: null, reach: new Map() };
    const island = islandAt({ lat, lng });
    if (!island) return { island: null, reach: new Map() };
    const onIsland = places.filter((p) => p.island === island);
    const reach = reachByRoad(roadGraph(island), { lat, lng }, onIsland, mode);
    return { island, reach: new Map(reach.map((r) => [r.id, r])) };
  }, [lat, lng, places, mode]);
}
