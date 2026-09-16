import {
  DEFAULT_HOUSEHOLD,
  RULES_VERSION,
  checklistProgress,
  computeChecklist,
  describeHousehold,
  diffChecklists,
  formatQty,
  sanitizeHousehold,
  shortfall,
} from '@/domain/rules';
import type { Household } from '@/domain/types';

const threePager: Household = {
  ...DEFAULT_HOUSEHOLD,
  people: 4,
  elders: 1,
  infants: 0,
  pets: 1,
  generator: false,
  prepDays: 3,
};

const byId = (hh: Household) => Object.fromEntries(computeChecklist(hh).map((i) => [i.id, i]));

describe('rules table (rulesVersion ' + RULES_VERSION + ')', () => {
  test('3-pager verification vector: water 60 L, meds 7 days, batteries 8, cash $200', () => {
    const items = byId(threePager);
    expect(items.water.qty).toBe(60);
    expect(items.water.unit).toBe('L');
    expect(items.meds.qty).toBe(7);
    expect(items.meds.required).toBe(true);
    expect(items.batt.qty).toBe(8);
    expect(items.cash.qty).toBe(200);
    expect(items.docs.qty).toBeNull();
  });

  test('water formula string shows the multiplication', () => {
    expect(byId(threePager).water.formula).toBe('4 L × 3 days × 5 people = 60 L');
  });

  test('demo scene: growing the household re-computes water immediately (4 → 6 people, 1 elder: 60 L → 84 L)', () => {
    // eff = 6 people + 1 elder = 7 → 4 × 3 × 7 = 84. (The 3-pager's "60 → 80" line ignored the elder.)
    const six = { ...threePager, people: 6 };
    expect(byId(six).water.qty).toBe(84);
    const diffs = diffChecklists(threePager, six);
    const water = diffs.find((d) => d.id === 'water');
    expect(water).toEqual({ id: 'water', name: 'Drinking water', from: '60 L', to: '84 L', kind: 'changed' });
  });

  test('demo scene without elders: 5 → 7 people moves water 60 L → 84 L, batteries 10 → 14', () => {
    const five = { ...threePager, people: 5, elders: 0 };
    expect(byId(five).water.qty).toBe(60);
    expect(byId({ ...five, people: 7 }).water.qty).toBe(84);
    expect(byId({ ...five, people: 7 }).batt.qty).toBe(14);
  });

  test('same input → same output (deterministic)', () => {
    expect(computeChecklist(threePager)).toEqual(computeChecklist({ ...threePager }));
  });

  test('medication forces a minimum of 7 days but follows longer periods', () => {
    expect(byId({ ...threePager, prepDays: 3 }).meds.qty).toBe(7);
    expect(byId({ ...threePager, prepDays: 14 }).meds.qty).toBe(14);
  });

  test('medication is not marked required without elders', () => {
    expect(byId({ ...threePager, elders: 0 }).meds.required).toBe(false);
  });

  test('generator halves batteries and adds a fuel item', () => {
    const items = byId({ ...threePager, generator: true });
    expect(items.batt.qty).toBe(4);
    expect(items.fuel.qty).toBeCloseTo(2.1, 5);
    expect(items.fuel.unit).toBe('gal');
    expect(byId(threePager).fuel).toBeUndefined();
  });

  test('infants activate formula and add to the water head-count', () => {
    const items = byId({ ...threePager, infants: 1 });
    expect(items.formula.qty).toBe(3);
    expect(items.water.qty).toBe(4 * 3 * 6);
    expect(byId(threePager).formula).toBeUndefined();
  });

  test('pets activate pet food and pet water; none without pets', () => {
    const items = byId(threePager);
    expect(items.petfood.qty).toBe(3);
    expect(items.petwater.qty).toBe(3);
    const noPets = byId({ ...threePager, pets: 0 });
    expect(noPets.petfood).toBeUndefined();
    expect(noPets.petwater).toBeUndefined();
  });

  test('cash is clamped to [100, 500]', () => {
    expect(byId({ ...threePager, people: 1 }).cash.qty).toBe(100);
    expect(byId({ ...threePager, people: 12 }).cash.qty).toBe(500);
  });

  test('every quantity item has a formula and a why', () => {
    for (const item of computeChecklist({ ...threePager, generator: true, infants: 1 })) {
      expect(item.formula.length).toBeGreaterThan(0);
      expect(item.why.length).toBeGreaterThan(20);
      expect(item.source.length).toBeGreaterThan(0);
    }
  });

  test('formatQty', () => {
    expect(formatQty({ qty: 60, unit: 'L' })).toBe('60 L');
    expect(formatQty({ qty: 200, unit: 'USD' })).toBe('$200');
    expect(formatQty({ qty: null, unit: 'copies' })).toBe('copies');
  });

  test('shortfall: checked at 60 L, household grows to 84 L → 24 L more needed', () => {
    const water = byId({ ...threePager, people: 6 }).water;
    const state = { itemId: 'water', done: true, qtyAtCheck: 60, unit: 'L', doneAt: 'x', source: 'local' as const };
    expect(shortfall(water, state)).toBe(24);
    expect(shortfall(water, { ...state, qtyAtCheck: 84 })).toBeNull();
    expect(shortfall(water, { ...state, done: false })).toBeNull();
    expect(shortfall(water, undefined)).toBeNull();
  });

  test('checklist progress', () => {
    const items = computeChecklist(threePager);
    const state = { water: { itemId: 'water', done: true, qtyAtCheck: 60, unit: 'L', doneAt: 'x', source: 'local' as const } };
    const p = checklistProgress(items, state);
    expect(p.done).toBe(1);
    expect(p.total).toBe(items.length);
    expect(p.pct).toBe(Math.round((1 / items.length) * 100));
  });

  test('describeHousehold', () => {
    expect(describeHousehold(threePager)).toBe('4 people · 1 elder · 1 pet');
    expect(describeHousehold({ ...threePager, people: 1, elders: 0, pets: 2, generator: true })).toBe('1 person · 2 pets · generator');
  });

  test('sanitizeHousehold clamps, defaults and stamps the rules version', () => {
    const h = sanitizeHousehold({ people: 99, elders: -1, prepDays: 5 as never, island: 'mars' as never });
    expect(h.people).toBe(12);
    expect(h.elders).toBe(0);
    expect(h.prepDays).toBe(3);
    expect(h.island).toBe('saipan');
    expect(h.rulesVersion).toBe(RULES_VERSION);
    expect(sanitizeHousehold(null)).toEqual(DEFAULT_HOUSEHOLD);
  });
});
