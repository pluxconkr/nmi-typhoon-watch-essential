/**
 * Places you can be given directions to, and how a navigation link ("to" parameter) maps onto them.
 */
import type { IslandId } from '@/domain/geo';
import type { Shelter, SupplyStore } from '@/domain/types';

import type { NavRequest } from './navigation';

export type Place = { id: string; name: string; lat: number; lng: number; island: IslandId };

export function shelterPlace(s: Shelter): Place {
  return { id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng, island: s.island };
}

/** When only the village is known, directions go to its centre — and the destination says so. */
export function storePlace(s: SupplyStore): Place {
  return { id: s.id, name: s.coordConfidence === 'low' ? `${s.village} centre (${s.name})` : s.name, lat: s.lat, lng: s.lng, island: s.island };
}

/**
 * "nearest-shelter" | "nearest-medical-shelter" | "shelter:<id>" | "store:<id>" → what to navigate to; null if unknown.
 * "Nearest" only ever picks shelters on the latest official list — never one used only in an earlier storm.
 */
export function navRequestFor(to: string | undefined, shelters: Shelter[], stores: SupplyStore[] = []): NavRequest | null {
  const current = shelters.filter((s) => s.designation !== 'past');
  if (!to || to === 'nearest-shelter') return { kind: 'nearest', places: current.map(shelterPlace), label: 'shelter' };
  if (to === 'nearest-medical-shelter') return { kind: 'nearest', places: current.filter((s) => s.medicalSupport === true).map(shelterPlace), label: 'medical-support shelter' };
  const [kind, id] = to.split(':');
  if (kind === 'shelter') {
    const s = shelters.find((x) => x.shelterId === id);
    return s ? { kind: 'place', place: shelterPlace(s) } : null;
  }
  if (kind === 'store') {
    const s = stores.find((x) => x.id === id);
    return s ? { kind: 'place', place: storePlace(s) } : null;
  }
  return null;
}
