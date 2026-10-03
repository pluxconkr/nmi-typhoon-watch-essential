/**
 * S-06 Shelter · offline shelter map + list (tab 3). Zero network requests on this screen.
 * GPS works without a signal; distances are straight-line. Never an empty screen.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ISLAND_NAME, type IslandId, formatDistance, haversineKm, islandAt } from '@/domain/geo';
import { isStale, relativeAgo } from '@/domain/time';
import type { Shelter } from '@/domain/types';
import { acquireLocation } from '@/services/location';
import { isOfflineNow, useAppState } from '@/store/appStore';
import { IslandMap, MapLegend } from '@/ui/IslandMap';
import { Callout, Cell, Group, SectionFooter, SectionHeader, Segmented, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { GUTTER, colors } from '@/ui/theme';

type Filter = 'all' | 'medical';

export default function ShelterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shelters = useAppState((s) => s.shelters);
  const source = useAppState((s) => s.shelterSource);
  const meta = useAppState((s) => s.cacheMeta.shelters);
  const location = useAppState((s) => s.location);
  const locStatus = useAppState((s) => s.locationStatus);
  const offline = useAppState((s) => isOfflineNow(s));
  const household = useAppState((s) => s.household);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  // Map island: the one you are on (GPS, works offline) until you pick another; Saipan otherwise.
  // Deep link for demos and tests: nmityphoonwatch://shelter?island=tinian
  const { island: islandParam } = useLocalSearchParams<{ island?: string }>();
  const paramIsland = islandParam === 'saipan' || islandParam === 'tinian' || islandParam === 'rota' ? islandParam : null;
  const [islandChoice, setIslandChoice] = useState<IslandId | null>(paramIsland);
  const [appliedParam, setAppliedParam] = useState(paramIsland);
  if (paramIsland !== appliedParam) {
    // A new deep link overrides the manual choice (state reset during render, the React-sanctioned pattern).
    setAppliedParam(paramIsland);
    setIslandChoice(paramIsland);
  }
  const island: IslandId = islandChoice ?? (location ? islandAt(location) : null) ?? 'saipan';
  const countOn = (id: IslandId) => shelters.filter((s) => s.island === id).length;

  useEffect(() => {
    if (locStatus === 'idle') void acquireLocation();
  }, [locStatus]);

  const list = useMemo(() => {
    const withDist = shelters.map((s) => ({ s, km: location ? haversineKm(location, s) : null }));
    const filtered = filter === 'medical' ? withDist.filter((x) => x.s.wheelchair === true) : withDist;
    return filtered.sort((a, b) => {
      if (a.km !== null && b.km !== null) return a.km - b.km;
      if (a.km !== null) return -1;
      if (b.km !== null) return 1;
      return a.s.island === 'saipan' ? -1 : 1;
    });
  }, [shelters, location, filter]);

  const grouped = useMemo(() => {
    if (location) return null;
    const m = new Map<string, Shelter[]>();
    for (const x of list) {
      const key = `${x.s.island === 'saipan' ? 'Saipan' : x.s.island === 'tinian' ? 'Tinian' : 'Rota'} · ${x.s.village}`;
      m.set(key, [...(m.get(key) ?? []), x.s]);
    }
    return m;
  }, [list, location]);

  const stale = source === 'network' && meta?.fetchedAt ? isStale(meta.fetchedAt) : false;
  const mapWidth = Math.min(width - GUTTER * 2, 600);
  const gpsLine =
    locStatus === 'granted' && location
      ? 'GPS works without a signal. Distances are straight-line from your position.'
      : locStatus === 'denied'
        ? 'Location permission is off — shelters are grouped by village instead of sorted by distance.'
        : locStatus === 'requesting'
          ? 'Getting your position from GPS…'
          : 'No GPS fix yet — shelters are grouped by village.';
  const open = (s: Shelter) => router.push({ pathname: '/shelter/[id]', params: { id: s.shelterId } });
  const sub = (s: Shelter) => [s.village, s.designCapacity ? `space ${s.designCapacity}` : null, s.wheelchair ? 'accessible' : null].filter(Boolean).join(' · ');

  return (
    <Screen largeTitle="Shelter" subtitle={`${shelters.length} shelters · Saipan, Tinian, Rota`} testID="shelter">
      {offline && source === 'bundle' ? (
        <Callout icon="offline" tone="red" title="No signal — showing the list that came with the app">
          <Subhead>This is the built-in copy, not a live download. It may be older than the latest HSEM announcement, but it is never blank.</Subhead>
        </Callout>
      ) : null}
      {stale ? (
        <Callout icon="clock" tone="amber" title="Shelter list is older than 7 days">
          <Subhead>Refresh it while you have signal. The old list stays usable until then.</Subhead>
        </Callout>
      ) : null}

      <View style={styles.islandPicker}>
        <Segmented<IslandId>
          label="Island"
          options={(['saipan', 'tinian', 'rota'] as const).map((id) => ({ value: id, label: `${ISLAND_NAME[id]} · ${countOn(id)}` }))}
          value={island}
          onChange={(id) => {
            setIslandChoice(id);
            setSelected(null);
          }}
        />
      </View>
      <IslandMap island={island} shelters={shelters} location={location} selectedId={selected} onSelect={(s) => setSelected(s.shelterId)} width={mapWidth} height={Math.round(mapWidth * 0.8)} />
      <MapLegend hasPosition={!!location} />
      <SectionFooter style={{ paddingHorizontal: 0 }}>{gpsLine}</SectionFooter>

      <View style={styles.filter}>
        <Segmented<Filter>
          label="Shelter filter"
          options={[
            { value: 'all', label: 'All shelters' },
            { value: 'medical', label: 'Elderly / medical needs' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      {household.pets > 0 ? (
        <Callout icon="pet" tone="amber" title="Pets: service animals only">
          <Subhead>CNMI public shelters accept only certified service animals. Plan to leave pets with family or friends in a sturdy building, with the pet food and water from your checklist.</Subhead>
        </Callout>
      ) : null}

      {grouped ? (
        Array.from(grouped.entries()).map(([village, rows]) => (
          <View key={village}>
            <SectionHeader>{village}</SectionHeader>
            <Group>
              {rows.map((s, i) => (
                <Cell key={s.shelterId} icon="shelter" iconColor={colors.green} title={s.name} subtitle={sub(s)} accessory="chevron" onPress={() => open(s)} accessibilityLabel={`${s.name}, ${s.village}`} last={i === rows.length - 1} />
              ))}
            </Group>
          </View>
        ))
      ) : (
        <>
          <SectionHeader right="Straight-line distance">Nearest shelters ({list.length})</SectionHeader>
          <Group>
            {list.map((r, i) => (
              <Cell key={r.s.shelterId} icon="shelter" iconColor={colors.green} title={r.s.name} subtitle={sub(r.s)} value={r.km !== null ? formatDistance(r.km) : undefined} accessory="chevron" onPress={() => open(r.s)} accessibilityLabel={`${r.s.name}, ${r.s.village}${r.km !== null ? `, ${formatDistance(r.km)} away` : ''}`} last={i === list.length - 1} />
            ))}
          </Group>
        </>
      )}
      {grouped ? <SectionFooter style={{ paddingHorizontal: 0, marginTop: -4 }}>{`Shelters by village (${list.length}) · grouped until GPS has a fix`}</SectionFooter> : null}

      <SectionHeader>Data</SectionHeader>
      <Group>
        <Cell icon="download" iconColor={colors.green} title="Manage offline data" subtitle={source === 'network' && meta?.fetchedAt ? `Shelters saved ${relativeAgo(meta.fetchedAt)}` : 'Bundled copy · check for a newer list when online'} accessory="chevron" onPress={() => router.push('/downloads')} last />
      </Group>
      <SectionFooter>Capacity shown is design capacity, not live availability. For transport or confirmation call the HSEM State Warning Point at (670) 237-8000 or (670) 664-8000.</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: { marginTop: 10, marginBottom: 2 },
  islandPicker: { marginTop: 8, marginBottom: 10 },
});
