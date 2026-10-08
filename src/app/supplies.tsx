/**
 * Where to buy supplies: groceries, pharmacies, hardware, gas — bundled, verified, offline.
 * On an island, stores with a real map pin are ranked by road time from you; stores known only by village
 * (no published location) are grouped by village, without a misleading distance.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { supplyRepo } from '@/data/repos';
import { ISLAND_NAME } from '@/domain/geo';
import { formatNavDistance, formatTravelTime } from '@/domain/routing';
import { SUPPLY_LABEL } from '@/domain/supplies';
import type { SupplyCategory, SupplyStore } from '@/domain/types';
import { storePlace } from '@/services/destinations';
import { useLiveLocation } from '@/services/location';
import { useRoadReach } from '@/store/derived';
import { supplyIcon } from '@/ui/icons';
import { LocationCell } from '@/ui/location-widgets';
import { Cell, Group, SectionFooter, SectionHeader, Segmented } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

type Filter = 'all' | 'food' | 'pharmacy' | 'hardware' | 'fuel';
const MATCH: Record<Filter, (c: SupplyCategory) => boolean> = {
  all: () => true,
  food: (c) => c === 'grocery' || c === 'convenience',
  pharmacy: (c) => c === 'pharmacy',
  hardware: (c) => c === 'hardware',
  fuel: (c) => c === 'fuel',
};

export default function SuppliesScreen() {
  const router = useRouter();
  useLiveLocation('browse');
  const stores = supplyRepo.get();
  const [filter, setFilter] = useState<Filter>('all');
  const places = useMemo(() => stores.map(storePlace), [stores]);
  const { island, reach } = useRoadReach(places, 'drive');
  const visible = stores.filter((s) => MATCH[filter](s.category));
  const byTime = (a: SupplyStore, b: SupplyStore) => (reach.get(a.id)?.durationS ?? Infinity) - (reach.get(b.id)?.durationS ?? Infinity);
  const ranked = island ? visible.filter((s) => s.island === island && s.coordConfidence !== 'low').sort(byTime) : [];
  // Village-level stores: grouped by village, villages nearest first when you are on the island.
  const grouped = new Map<string, SupplyStore[]>();
  for (const s of island ? [...visible].sort(byTime) : visible) {
    if (s.island === island && s.coordConfidence !== 'low') continue;
    const key = `${ISLAND_NAME[s.island]} · ${s.village}`;
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }
  const open = (s: SupplyStore) => router.push({ pathname: '/store/[id]', params: { id: s.id } });
  const sub = (s: SupplyStore, extra?: string) => [SUPPLY_LABEL[s.category], extra, s.coordConfidence === 'low' ? `somewhere in ${s.village}` : null, s.status === 'unknown' ? 'not confirmed open' : null].filter(Boolean).join(' · ');

  return (
    <Screen title="Supplies" largeTitle="Where to buy supplies" subtitle={`${stores.length} stores · food, water, medicine, hardware, gas`} testID="supplies">
      <View style={{ marginTop: 8, marginBottom: 2 }}>
        <Segmented<Filter>
          label="Store type"
          options={[
            { value: 'all', label: 'All' },
            { value: 'food', label: 'Food' },
            { value: 'pharmacy', label: 'Pharmacy' },
            { value: 'hardware', label: 'Hardware' },
            { value: 'fuel', label: 'Gas' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      <Group style={{ marginTop: 10 }}>
        <LocationCell last />
      </Group>

      {island && ranked.length ? (
        <>
          <SectionHeader>{`${ISLAND_NAME[island]} · mapped stores by road (${ranked.length})`}</SectionHeader>
          <Group>
            {ranked.map((s, i) => {
              const r = reach.get(s.id);
              return <Cell key={s.id} icon={supplyIcon(s.category)} iconColor={colors.tint} title={s.name} subtitle={sub(s, r ? `${formatTravelTime(r.durationS)} by car` : s.village)} value={r ? formatNavDistance(r.distanceM) : undefined} accessory="chevron" onPress={() => open(s)} last={i === ranked.length - 1} />;
            })}
          </Group>
        </>
      ) : null}
      {grouped.size ? <SectionFooter style={{ marginTop: 12 }}>{island ? 'Below: stores whose exact spot is not published — grouped by village, nearest village first.' : 'Grouped by village.'}</SectionFooter> : null}
      {Array.from(grouped.entries()).map(([village, rows]) => (
        <View key={village}>
          <SectionHeader>{village}</SectionHeader>
          <Group>
            {rows.map((s, i) => (
              <Cell key={s.id} icon={supplyIcon(s.category)} iconColor={colors.tint} title={s.name} subtitle={sub(s)} accessory="chevron" onPress={() => open(s)} last={i === rows.length - 1} />
            ))}
          </Group>
        </View>
      ))}
      <SectionFooter>
        {`Checked against 2025–26 sources${supplyRepo.verifiedOn() ? ` on ${supplyRepo.verifiedOn()}` : ''}; each store lists its sources. Stores close or run out before a storm — call ahead when you have signal.`}
      </SectionFooter>
    </Screen>
  );
}
