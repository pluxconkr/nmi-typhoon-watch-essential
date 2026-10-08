/**
 * S-06 Shelter · offline shelter map + list (tab 3). Zero network requests on this screen.
 * GPS works without a signal and updates live while this tab is open. Never an empty screen.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ISLAND_NAME, type IslandId, islandAt } from '@/domain/geo';
import { formatNavDistance, formatTravelTime } from '@/domain/routing';
import { isStale, relativeAgo } from '@/domain/time';
import type { Shelter } from '@/domain/types';
import { shelterRepo } from '@/data/repos';
import { CONTACTS } from '@/domain/contacts';
import { shelterPlace } from '@/services/destinations';
import { useLiveLocation } from '@/services/location';
import { isOfflineNow, useAppState } from '@/store/appStore';
import { useRoadReach } from '@/store/derived';
import { IslandMap, MapLegend } from '@/ui/IslandMap';
import { LocationCell } from '@/ui/location-widgets';
import { Button, Callout, Cell, Group, SectionFooter, SectionHeader, Segmented, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { GUTTER, colors } from '@/ui/theme';

type Filter = 'all' | 'medical';

const HSEM = CONTACTS.find((c) => c.id === 'hsem-swp')!;
const CHCC = CONTACTS.find((c) => c.id === 'chcc-medical')!;

export default function ShelterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shelters = useAppState((s) => s.shelters);
  const source = useAppState((s) => s.shelterSource);
  const meta = useAppState((s) => s.cacheMeta.shelters);
  const location = useAppState((s) => s.location);
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

  useLiveLocation('browse');

  const places = useMemo(() => shelters.map(shelterPlace), [shelters]);
  const { island: hereIsland, reach } = useRoadReach(places, 'drive');
  const visible = useMemo(() => (filter === 'medical' ? shelters.filter((s) => s.medicalSupport === true) : shelters), [shelters, filter]);
  // On an island: shelters on the latest official list ranked by road time, then ones used only in earlier storms;
  // other islands grouped by village.
  const { ranked, earlier } = useMemo(() => {
    const byTime = (a: Shelter, b: Shelter) => (reach.get(a.shelterId)?.durationS ?? Infinity) - (reach.get(b.shelterId)?.durationS ?? Infinity);
    const here = hereIsland ? visible.filter((s) => s.island === hereIsland).sort(byTime) : [];
    return { ranked: here.filter((s) => s.designation !== 'past'), earlier: here.filter((s) => s.designation === 'past') };
  }, [visible, hereIsland, reach]);
  const nearest = ranked.length && reach.get(ranked[0].shelterId) ? ranked[0] : null;
  const latest = shelterRepo.latestAnnouncement();
  const currentCount = shelters.filter((s) => s.designation !== 'past').length;
  const grouped = useMemo(() => {
    const m = new Map<string, Shelter[]>();
    for (const s of visible) {
      if (s.island === hereIsland) continue;
      const key = `${ISLAND_NAME[s.island]} · ${s.village}`;
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return m;
  }, [visible, hereIsland]);

  const stale = source === 'network' && meta?.fetchedAt ? isStale(meta.fetchedAt) : false;
  const mapWidth = Math.min(width - GUTTER * 2, 600);
  const open = (s: Shelter) => router.push({ pathname: '/shelter/[id]', params: { id: s.shelterId } });
  const sub = (s: Shelter) =>
    [s.caution ? 'damaged — check first' : null, s.village, s.designCapacity ? `space ${s.designCapacity}` : null, s.medicalSupport ? 'medical support' : null, s.designation === 'past' ? 'earlier storms only' : null].filter(Boolean).join(' · ');
  const byRoad = (s: Shelter) => {
    const r = reach.get(s.shelterId);
    return r ? `${formatTravelTime(r.durationS)} by car · ${sub(s)}` : `No road route · ${sub(s)}`;
  };
  const nearestReach = nearest ? reach.get(nearest.shelterId)! : null;

  return (
    <Screen largeTitle="Shelter" subtitle={`${currentCount} on the latest official list · ${shelters.length - currentCount} used in earlier storms`} testID="shelter">
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
      <IslandMap key={island} island={island} shelters={shelters} location={location} selectedId={selected} onSelect={(s) => setSelected(s.shelterId)} width={mapWidth} height={Math.round(mapWidth * 0.8)} />
      <MapLegend hasPosition={!!location} />
      <Group style={{ marginTop: 10 }}>
        <LocationCell last />
      </Group>

      {nearest && nearestReach ? (
        <>
          <SectionHeader>{filter === 'medical' ? 'Nearest medical-support shelter by road' : 'Nearest shelter by road'}</SectionHeader>
          <Group>
            <Cell icon="shelter" iconColor={colors.green} title={nearest.name} subtitle={`${formatNavDistance(nearestReach.distanceM)} · about ${formatTravelTime(nearestReach.durationS)} by car · ${nearest.village}`} accessory="chevron" onPress={() => open(nearest)} last />
          </Group>
          <Button title="Start navigation" icon="directions" onPress={() => router.push(`/navigate?to=${filter === 'medical' ? 'nearest-medical-shelter' : 'nearest-shelter'}`)} testID="nearest-navigate" />
          <SectionFooter>{`Only shelters on the latest official list (${latest.storm}, ${latest.dates}). Turn-by-turn on the road map stored on this phone — no signal needed.`}</SectionFooter>
        </>
      ) : null}

      <View style={styles.filter}>
        <Segmented<Filter>
          label="Shelter filter"
          options={[
            { value: 'all', label: 'All shelters' },
            { value: 'medical', label: 'Medical support' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      {filter === 'medical' ? (
        <Callout icon="pharmacy" tone="tint" title="Medical support">
          <Subhead>{`These shelters were named for residents needing medical support or shelter assistance (CNMI JIC, ${latest.dates}). Transport: HSEM ${HSEM.display}. Medical evacuation help: CHCC ${CHCC.display}. Expectant mothers at 36+ weeks: CHCC, or the health center on Tinian or Rota.`}</Subhead>
        </Callout>
      ) : null}
      {household.pets > 0 ? (
        <Callout icon="pet" tone="amber" title="Pets: service animals only">
          <Subhead>CNMI public shelters accept only certified service animals. Plan to leave pets with family or friends in a sturdy building, with the pet food and water from your checklist.</Subhead>
        </Callout>
      ) : null}

      {hereIsland && (ranked.length || earlier.length) ? (
        <>
          {ranked.length ? (
            <>
              <SectionHeader>{`${ISLAND_NAME[hereIsland]} · by road from you (${ranked.length})`}</SectionHeader>
              <Group>
                {ranked.map((s, i) => {
                  const r = reach.get(s.shelterId);
                  return <Cell key={s.shelterId} icon="shelter" iconColor={colors.green} title={s.name} subtitle={byRoad(s)} value={r ? formatNavDistance(r.distanceM) : undefined} accessory="chevron" onPress={() => open(s)} accessibilityLabel={`${s.name}, ${s.village}${r ? `, ${formatNavDistance(r.distanceM)} by road` : ''}`} last={i === ranked.length - 1} />;
                })}
              </Group>
            </>
          ) : null}
          {earlier.length ? (
            <>
              <SectionHeader>{`Used in earlier storms · call HSEM first (${earlier.length})`}</SectionHeader>
              <Group>
                {earlier.map((s, i) => {
                  const r = reach.get(s.shelterId);
                  return <Cell key={s.shelterId} icon="shelter" iconColor={colors.ink2} title={s.name} subtitle={byRoad(s)} value={r ? formatNavDistance(r.distanceM) : undefined} accessory="chevron" onPress={() => open(s)} accessibilityLabel={`${s.name}, used in earlier storms only${r ? `, ${formatNavDistance(r.distanceM)} by road` : ''}`} last={i === earlier.length - 1} />;
                })}
              </Group>
              <SectionFooter>{`Not on the latest official list (${latest.storm}, ${latest.dates}). Call HSEM ${HSEM.display} before going.`}</SectionFooter>
            </>
          ) : null}
        </>
      ) : null}
      {Array.from(grouped.entries()).map(([village, rows]) => (
        <View key={village}>
          <SectionHeader>{village}</SectionHeader>
          <Group>
            {rows.map((s, i) => (
              <Cell key={s.shelterId} icon="shelter" iconColor={s.designation === 'past' ? colors.ink2 : colors.green} title={s.name} subtitle={sub(s)} accessory="chevron" onPress={() => open(s)} accessibilityLabel={`${s.name}, ${s.village}${s.designation === 'past' ? ', used in earlier storms only' : ''}`} last={i === rows.length - 1} />
            ))}
          </Group>
        </View>
      ))}
      {!hereIsland ? <SectionFooter style={{ paddingHorizontal: 0, marginTop: -4 }}>{`Shelters by village (${visible.length}) · sorted by road distance once GPS places you on an island`}</SectionFooter> : null}

      <SectionHeader>Supplies</SectionHeader>
      <Group>
        <Cell icon="cart" title="Where to buy supplies" subtitle="Groceries, pharmacies, hardware, gas · offline" accessory="chevron" onPress={() => router.push('/supplies')} last />
      </Group>

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
