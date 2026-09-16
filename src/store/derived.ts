/**
 * Derived state hooks: phase, preparation window, checklist rows. Pure derivations over the store
 * plus a slow clock tick so the window/phase advance without user interaction.
 */
import { useEffect, useMemo, useState } from 'react';

import { derivePhase, type PhaseState } from '@/domain/phase';
import { computeChecklist } from '@/domain/rules';
import { hoursBetween } from '@/domain/time';
import type { PrepWindow } from '@/domain/types';
import { windowFor } from '@/domain/windows';

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
