/**
 * Rules table — the ONLY place quantities come from. No AI.
 *
 * Same input → same output, and every number can show its own multiplication
 * on screen ("Why this number?"). Change RULES_VERSION whenever a formula changes
 * so past checklists can be reproduced.
 */
import type { ChecklistItem, ChecklistState, Household, PrepDays } from './types';

export const RULES_VERSION = '2026.09.1';

export const PREP_DAY_OPTIONS: readonly PrepDays[] = [3, 7, 14] as const;

export const HOUSEHOLD_LIMITS = {
  people: { min: 1, max: 12 },
  elders: { min: 0, max: 8 },
  infants: { min: 0, max: 6 },
  pets: { min: 0, max: 8 },
} as const;

/** Litres of drinking water per person per day (FEMA: 1 gallon ≈ 3.8 L, rounded up). */
export const WATER_L_PER_PERSON_DAY = 4;
/** Medication must always cover at least this many days. */
export const MIN_MEDICATION_DAYS = 7;
/** Batteries / power banks per person. */
export const BATTERIES_PER_PERSON = 2;
/** Small generator fuel per week, gallons. */
export const FUEL_GAL_PER_WEEK = 5;
/** Litres of water per pet per day. */
export const PET_WATER_L_PER_DAY = 1;
/** Cash per person, USD, and the clamp range. */
export const CASH_PER_PERSON = 50;
export const CASH_MIN = 100;
export const CASH_MAX = 500;

export const DEFAULT_HOUSEHOLD: Household = {
  people: 2,
  elders: 0,
  infants: 0,
  pets: 0,
  generator: false,
  prepDays: 3,
  island: 'saipan',
  rulesVersion: RULES_VERSION,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Coerce arbitrary stored data into a valid Household (defensive against old versions). */
export function sanitizeHousehold(input: Partial<Household> | null | undefined): Household {
  const h = { ...DEFAULT_HOUSEHOLD, ...(input ?? {}) };
  const int = (v: unknown, lo: number, hi: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : fallback;
  return {
    people: int(h.people, HOUSEHOLD_LIMITS.people.min, HOUSEHOLD_LIMITS.people.max, 2),
    elders: int(h.elders, HOUSEHOLD_LIMITS.elders.min, HOUSEHOLD_LIMITS.elders.max, 0),
    infants: int(h.infants, HOUSEHOLD_LIMITS.infants.min, HOUSEHOLD_LIMITS.infants.max, 0),
    pets: int(h.pets, HOUSEHOLD_LIMITS.pets.min, HOUSEHOLD_LIMITS.pets.max, 0),
    generator: h.generator === true,
    prepDays: PREP_DAY_OPTIONS.includes(h.prepDays as PrepDays) ? (h.prepDays as PrepDays) : 3,
    island: h.island === 'tinian' || h.island === 'rota' ? h.island : 'saipan',
    village: typeof h.village === 'string' ? h.village : undefined,
    rulesVersion: RULES_VERSION,
    updatedAt: typeof h.updatedAt === 'string' ? h.updatedAt : DEFAULT_HOUSEHOLD.updatedAt,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Compute the checklist for a household. Pure and deterministic.
 *
 * Verification vector (from the 3-pager): people 4, elders 1, pets 1, days 3
 *   → water 60 L, medication 7 days, batteries 8, cash $200.
 */
export function computeChecklist(hh: Household): ChecklistItem[] {
  const days = hh.prepDays;
  const eff = hh.people + hh.elders + hh.infants;
  const out: ChecklistItem[] = [];

  const water = WATER_L_PER_PERSON_DAY * days * eff;
  out.push({
    id: 'water',
    name: 'Drinking water',
    qty: water,
    unit: 'L',
    formula: `${WATER_L_PER_PERSON_DAY} L × ${days} days × ${eff} people = ${water} L`,
    why:
      `FEMA recommends 1 gallon (about 3.8 L) per person per day for drinking and light hygiene. We round up to 4 L. ` +
      `People counted: ${hh.people} in the household + ${hh.elders} elderly/medical + ${hh.infants} infants = ${eff}, ` +
      `because elders and infants need extra water for medicine, formula and cleaning.`,
    source: 'FEMA / Ready.gov',
    bringToShelter: true,
  });

  out.push({
    id: 'food',
    name: 'Non-perishable food',
    qty: days,
    unit: 'days',
    formula: `days = ${days}`,
    why:
      `Food that needs no cooking or refrigeration for ${days} days. We show days, not item counts, ` +
      `because food comes in every shape and size — "3 days for everyone" is harder to misread than "17 cans".`,
    source: 'FEMA / Ready.gov',
  });

  const meds = Math.max(MIN_MEDICATION_DAYS, days);
  out.push({
    id: 'meds',
    name: 'Medication',
    qty: meds,
    unit: 'days',
    formula: `max(${MIN_MEDICATION_DAYS}, ${days}) = ${meds} days`,
    why:
      `Unlike food or water, medicine cannot be substituted when pharmacies are closed, so we force at least a ${MIN_MEDICATION_DAYS}-day supply. ` +
      (hh.elders > 0
        ? `Your household has ${plural(hh.elders, 'person', 'people')} with elderly or medical needs, so this item is marked required.`
        : `Include any prescriptions, inhalers, insulin and first-aid basics.`),
    source: 'FEMA / American Red Cross',
    required: hh.elders > 0,
    bringToShelter: true,
  });

  const batteries = hh.generator
    ? Math.ceil(BATTERIES_PER_PERSON * hh.people * 0.5)
    : BATTERIES_PER_PERSON * hh.people;
  out.push({
    id: 'batt',
    name: 'Batteries / power banks',
    qty: batteries,
    unit: 'units',
    formula: hh.generator
      ? `${BATTERIES_PER_PERSON} × ${hh.people} people × 0.5 (generator) = ${batteries}`
      : `${BATTERIES_PER_PERSON} × ${hh.people} people = ${batteries}`,
    why:
      `${BATTERIES_PER_PERSON} per person covers a flashlight and a radio or phone charge. ` +
      (hh.generator
        ? `With a generator at home we halve this and add a fuel item instead.`
        : `Power can be out for weeks in Saipan — Yutu (2018) took months, Sinlaku (2026) two weeks or more.`),
    source: 'FEMA / Ready.gov',
    bringToShelter: true,
  });

  if (hh.generator) {
    const fuel = round1((FUEL_GAL_PER_WEEK * days) / 7);
    out.push({
      id: 'fuel',
      name: 'Generator fuel',
      qty: fuel,
      unit: 'gal',
      formula: `${FUEL_GAL_PER_WEEK} gal × ${days} days ÷ 7 = ${fuel} gal`,
      why:
        `A small portable generator burns roughly ${FUEL_GAL_PER_WEEK} gallons a week on light use. Real consumption depends on the model, ` +
        `so treat this as a minimum. Run it OUTDOORS only, at least 20 feet from windows — carbon monoxide kills after every storm.`,
      source: 'FEMA / CDC',
    });
  }

  if (hh.infants > 0) {
    out.push({
      id: 'formula',
      name: 'Infant formula & diapers',
      qty: days,
      unit: 'days',
      formula: `days = ${days} (infants = ${hh.infants})`,
      why: `Activated because you registered ${plural(hh.infants, 'infant')}. Shelters are not assumed to stock formula, bottles or diapers.`,
      source: 'FEMA / Ready.gov',
      bringToShelter: true,
    });
  }

  if (hh.pets > 0) {
    out.push({
      id: 'petfood',
      name: 'Pet food',
      qty: days,
      unit: 'days',
      formula: `days = ${days} (pets = ${hh.pets})`,
      why: `Activated because you registered ${plural(hh.pets, 'pet')}. This also turns on the "pets allowed" shelter filter.`,
      source: 'FEMA / Ready.gov',
      bringToShelter: true,
    });
    const petWater = PET_WATER_L_PER_DAY * days * hh.pets;
    out.push({
      id: 'petwater',
      name: 'Pet water',
      qty: petWater,
      unit: 'L',
      formula: `${PET_WATER_L_PER_DAY} L × ${days} days × ${hh.pets} pets = ${petWater} L`,
      why: `About 1 L a day for a medium dog. Counted separately from people's water so the family supply is never short.`,
      source: 'FEMA / Ready.gov',
    });
  }

  const cash = clamp(CASH_PER_PERSON * hh.people, CASH_MIN, CASH_MAX);
  out.push({
    id: 'cash',
    name: 'Cash on hand',
    qty: cash,
    unit: 'USD',
    formula: `clamp(${CASH_PER_PERSON} × ${hh.people}, ${CASH_MIN}, ${CASH_MAX}) = $${cash}`,
    why:
      `When the power goes, card readers and ATMs go with it — this has happened in Saipan after every major typhoon. ` +
      `Small bills. The floor and ceiling keep the number realistic for any household size.`,
    source: 'FEMA / Ready.gov',
  });

  out.push({
    id: 'docs',
    name: 'Documents in a sealed bag',
    qty: null,
    unit: 'copies',
    formula: 'No quantity — presence only',
    why:
      `Copies of ID, insurance papers, medical records and proof of address in a waterproof bag. ` +
      `FEMA disaster assistance asks for these, and replacing wet originals can take weeks.`,
    source: 'FEMA',
    bringToShelter: true,
  });

  return out;
}

/** Format a quantity for display, e.g. "60 L", "$200", "copies". */
export function formatQty(item: Pick<ChecklistItem, 'qty' | 'unit'>): string {
  if (item.qty === null) return item.unit;
  if (item.unit === 'USD') return `$${item.qty}`;
  return `${item.qty} ${item.unit}`;
}

/**
 * How much MORE is needed now versus what was already checked off.
 * Returns null when the item is not done, has no quantity, or the target did not grow.
 */
export function shortfall(item: ChecklistItem, state: ChecklistState | undefined): number | null {
  if (!state?.done || item.qty === null || state.qtyAtCheck === null) return null;
  const diff = item.qty - state.qtyAtCheck;
  return diff > 0 ? diff : null;
}

export interface ChecklistDiff {
  id: string;
  name: string;
  from: string;
  to: string;
  kind: 'changed' | 'added' | 'removed';
}

/** Preview what changes between two households ("Water 60 L → 80 L"). */
export function diffChecklists(before: Household, after: Household): ChecklistDiff[] {
  const a = computeChecklist(before);
  const b = computeChecklist(after);
  const out: ChecklistDiff[] = [];
  for (const item of b) {
    const prev = a.find((x) => x.id === item.id);
    if (!prev) out.push({ id: item.id, name: item.name, from: '—', to: formatQty(item), kind: 'added' });
    else if (prev.qty !== item.qty)
      out.push({ id: item.id, name: item.name, from: formatQty(prev), to: formatQty(item), kind: 'changed' });
  }
  for (const prev of a) {
    if (!b.some((x) => x.id === prev.id))
      out.push({ id: prev.id, name: prev.name, from: formatQty(prev), to: 'removed', kind: 'removed' });
  }
  return out;
}

/** "4 people · 1 elder · 1 pet · generator" */
export function describeHousehold(hh: Household): string {
  const parts = [plural(hh.people, 'person', 'people')];
  if (hh.elders) parts.push(plural(hh.elders, 'elder'));
  if (hh.infants) parts.push(plural(hh.infants, 'infant'));
  if (hh.pets) parts.push(plural(hh.pets, 'pet'));
  if (hh.generator) parts.push('generator');
  return parts.join(' · ');
}

/** Progress as done/total/percent for the current household + state. */
export function checklistProgress(items: ChecklistItem[], state: Record<string, ChecklistState>) {
  const total = items.length;
  const done = items.filter((i) => state[i.id]?.done).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
