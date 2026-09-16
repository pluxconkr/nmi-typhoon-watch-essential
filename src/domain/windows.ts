/**
 * Preparation windows and the fixed "3 things today" per window.
 * Four branches, no AI. Exactly three tasks per window — if a fourth is needed,
 * change the mapping, never the count.
 */
import type { PrepWindow, TaskItem } from './types';

export const WINDOWS: readonly PrepWindow[] = ['72h', '48h', '24h', '6h'] as const;

/** Map hours-until-onset to a window. */
export function windowFor(hoursToOnset: number): PrepWindow {
  if (hoursToOnset > 48) return '72h';
  if (hoursToOnset > 24) return '48h';
  if (hoursToOnset > 6) return '24h';
  return '6h';
}

export const WINDOW_TASKS: Record<PrepWindow, readonly [TaskItem, TaskItem, TaskItem]> = {
  '72h': [
    { id: 'w72-download', title: 'Download map & shelters', note: 'Only possible while you still have signal' },
    { id: 'w72-shelter', title: 'Check your nearest shelter' },
    { id: 'w72-docs', title: 'Copy ID & insurance documents' },
  ],
  '48h': [
    { id: 'w48-water', title: 'Buy water & 7-day medication' },
    { id: 'w48-fuel', title: 'Fill car fuel tank' },
    { id: 'w48-power', title: 'Charge power banks' },
  ],
  '24h': [
    { id: 'w24-secure', title: 'Secure windows & outdoor items' },
    { id: 'w24-bathtub', title: 'Fill bathtub with washing water' },
    { id: 'w24-phone', title: 'Charge phone to 100%' },
  ],
  '6h': [
    { id: 'w6-safe', title: 'Move to your indoor safe spot' },
    { id: 'w6-contact', title: 'Confirm family contact plan' },
    { id: 'w6-inside', title: 'Do not go outside again', note: 'No more trips — the wind arrives before the rain stops' },
  ],
};

export const DURING_TASKS: readonly [TaskItem, TaskItem, TaskItem] = [
  { id: 'd-inner', title: 'Stay in the innermost room', note: 'No windows — a bathroom or hallway if you can' },
  { id: 'd-eye', title: 'Do not go outside when the wind stops', note: 'It may be the eye — wind returns from the other side' },
  { id: 'd-fridge', title: 'Keep the fridge closed', note: 'Food stays cold about 4 hours if the door stays shut' },
];

export const AFTER_TASKS: readonly [TaskItem, TaskItem, TaskItem] = [
  { id: 'a-lines', title: 'Assume every downed line is live', note: 'Electrocution is a leading cause of death after a storm' },
  { id: 'a-water', title: 'Do not drink tap water until cleared', note: 'Use stored or bottled water; boiling instructions are in the FAQ' },
  { id: 'a-photos', title: 'Photograph damage before cleanup', note: 'FEMA assistance needs proof' },
];

export const WINDOW_LABEL: Record<PrepWindow, string> = {
  '72h': '72 hours out',
  '48h': '48 hours out',
  '24h': '24 hours out',
  '6h': 'Final 6 hours',
};
