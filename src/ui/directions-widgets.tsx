/**
 * "Directions" block for a place: drive and walk times by road from where you are, each starting
 * full-screen navigation; or why there are none (no position yet, another island).
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { ISLAND_NAME, islandAt } from '@/domain/geo';
import type { TravelMode } from '@/domain/roads';
import { formatNavDistance, formatTravelTime } from '@/domain/routing';
import type { Place } from '@/services/destinations';
import { useAppState } from '@/store/appStore';
import { useRoadReach } from '@/store/derived';

import { LocationCell } from './location-widgets';
import { Cell, Group, SectionFooter, SectionHeader } from './primitives';
import { colors } from './theme';

/** `link` is the navigate target, e.g. "shelter:kagman-high-school". Pass a memoised `place` so road times are recomputed only when you move. */
export function DirectionsSection({ place, link }: { place: Place; link: string }) {
  const router = useRouter();
  const location = useAppState((s) => s.location);
  const places = useMemo(() => [place], [place]);
  const drive = useRoadReach(places, 'drive').reach.get(place.id);
  const walk = useRoadReach(places, 'walk').reach.get(place.id);
  const here = location ? islandAt(location) : null;
  const go = (mode: TravelMode) => router.push(`/navigate?to=${link}&mode=${mode}`);

  return (
    <>
      <SectionHeader>Directions</SectionHeader>
      <Group>
        {drive || walk ? (
          <>
            {drive ? <Cell icon="car" title={`Drive · ${formatTravelTime(drive.durationS)}`} subtitle={`${formatNavDistance(drive.distanceM)} by road`} value="Start" valueColor={colors.tint} onPress={() => go('drive')} accessibilityLabel={`Start driving directions, ${formatTravelTime(drive.durationS)}`} last={!walk} /> : null}
            {walk ? <Cell icon="walk" title={`Walk · ${formatTravelTime(walk.durationS)}`} subtitle={`${formatNavDistance(walk.distanceM)} on roads and paths`} value="Start" valueColor={colors.tint} onPress={() => go('walk')} accessibilityLabel={`Start walking directions, ${formatTravelTime(walk.durationS)}`} last /> : null}
          </>
        ) : here && here !== place.island ? (
          <Cell icon="alert" iconColor={colors.amber} title={`You are on ${ISLAND_NAME[here]}`} subtitle={`${place.name} is on ${ISLAND_NAME[place.island]}. Directions cannot cross the sea.`} last />
        ) : (
          <LocationCell last />
        )}
      </Group>
      <SectionFooter>Turn-by-turn on the OpenStreetMap road network stored on this phone — no signal needed. Times are estimates; storm debris may block roads.</SectionFooter>
    </>
  );
}
