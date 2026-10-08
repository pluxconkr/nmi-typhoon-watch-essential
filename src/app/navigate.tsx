/**
 * Full-screen turn-by-turn navigation (presented as a full-screen modal). Map, route, live GPS and the next
 * maneuver; re-plans when you leave the route; works with no signal. Params:
 *   to   = "nearest-shelter" | "nearest-medical-shelter" | "shelter:<id>" | "store:<id>"
 *   mode = "drive" (default) | "walk"
 */
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COASTLINES } from '@/data/coastlines';
import { supplyRepo } from '@/data/repos';
import { roadGraph } from '@/data/roads';
import { CONTACTS } from '@/domain/contacts';
import { ISLAND_NAME, islandAt, type IslandId } from '@/domain/geo';
import type { TravelMode } from '@/domain/roads';
import { type Step, formatNavDistance, formatTravelTime, instructionFor } from '@/domain/routing';
import { navRequestFor } from '@/services/destinations';
import { useLiveLocation } from '@/services/location';
import { NavSession, type NavSnapshot } from '@/services/navigation';
import { goBackOr } from '@/ui/Screen';
import { Icon, type IconName } from '@/ui/icons';
import { MAX_MPP, MIN_MPP, NavMap, fitView, type NavView } from '@/ui/NavMap';
import { Button, Segmented } from '@/ui/primitives';
import { colors, palette, tabular, type } from '@/ui/theme';
import { type AppState, useAppState } from '@/store/appStore';

/** Following zoom in metres per screen point; +/− and pinch change it continuously. */
const DEFAULT_MPP: Record<TravelMode, number> = { drive: 2, walk: 1.1 };
const ZOOM_STEP = 1.6;
const HSEM = CONTACTS.find((c) => c.id === 'hsem-swp')!;

function maneuverIcon(step: Step): IconName {
  const right = step.side === 'right';
  switch (step.maneuver) {
    case 'depart':
      return 'depart';
    case 'continue':
      return 'turnStraight';
    case 'slight':
      return right ? 'turnSlightRight' : 'turnSlightLeft';
    case 'turn':
      return right ? 'turnRight' : 'turnLeft';
    case 'sharp':
      return right ? 'turnSharpRight' : 'turnSharpLeft';
    case 'uturn':
      return 'uTurn';
    case 'arrive':
      return 'arrive';
  }
}

/** What the banner says for the current state. `depart`: the distance is how far to go on, not when to act. */
function bannerFor(snap: NavSnapshot, gps: AppState['locationStatus']): { icon: IconName; distance: string | null; text: string; detail: string | null; depart: boolean } {
  const name = snap.target?.name ?? 'the shelter';
  switch (snap.status) {
    case 'locating':
      if (gps === 'denied') return { icon: 'locationOff', distance: null, text: 'Location permission is off', detail: 'Directions need your position. Allow location for this app in Settings; GPS works without a signal.', depart: false };
      if (gps === 'off') return { icon: 'locationOff', distance: null, text: 'Location Services are off', detail: 'Directions need your position. Turn Location Services on in Settings; GPS works without a signal.', depart: false };
      return { icon: 'location', distance: null, text: 'Finding your position…', detail: 'GPS works without a signal. Directions start as soon as there is a fix.', depart: false };
    case 'off-island':
      return { icon: 'locationOff', distance: null, text: 'You are not on Saipan, Tinian or Rota', detail: 'Directions work on the islands. To try them elsewhere, pick a Demo GPS position in Settings.', depart: false };
    case 'other-island':
      return { icon: 'alert', distance: null, text: `${name} is on ${snap.targetIsland ? ISLAND_NAME[snap.targetIsland] : 'another island'}`, detail: `Directions cannot cross the sea. For help getting there call HSEM ${HSEM.display}.`, depart: false };
    case 'no-route':
      return { icon: 'alert', distance: null, text: 'No road route from here', detail: 'You are more than 500 m from a mapped road, or the roads here do not connect. Use the landmark directions.', depart: false };
    case 'arrived':
      return { icon: 'arrive', distance: null, text: `You have arrived`, detail: name, depart: false };
    case 'navigating': {
      const route = snap.route!;
      const pr = snap.progress!;
      // "Head south" first, unless the first turn is right away: then that turn must be on the banner already.
      const atStart = pr.stepIndex === 0 && pr.along < 25 && pr.toNextM >= 50;
      const step = atStart ? route.steps[0] : route.steps[pr.stepIndex + 1] ?? route.steps[route.steps.length - 1];
      const distance = atStart ? route.steps[0].endDist - pr.along : pr.toNextM;
      return { icon: maneuverIcon(step), distance: formatNavDistance(distance), text: instructionFor(step, route.destinationName), detail: null, depart: atStart };
    }
  }
}

export default function NavigateScreen() {
  useKeepAwake();
  useLiveLocation('navigate');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { to, mode: modeParam } = useLocalSearchParams<{ to?: string; mode?: string }>();
  const shelters = useAppState((s) => s.shelters);
  const location = useAppState((s) => s.location);
  const gps = useAppState((s) => s.locationStatus);
  const [session] = useState(() => {
    const request = navRequestFor(to, shelters, supplyRepo.get());
    return request ? new NavSession(request, modeParam === 'walk' ? 'walk' : 'drive', roadGraph) : null;
  });
  const snap = useSyncExternalStore(session?.subscribe ?? noopSubscribe, session?.getSnapshot ?? nullSnapshot);
  // Three ways to look: follow your position (default), the whole route (overview), or wherever you moved
  // the map with your fingers (free) until you tap Re-centre.
  const [followMpp, setFollowMpp] = useState(DEFAULT_MPP[snap?.mode ?? 'drive']);
  const [overview, setOverview] = useState(false);
  const [free, setFree] = useState<NavView | null>(null);

  // Measured, so the map's attribution, buttons and overview stay clear of them at any text size.
  const [bannerBottom, setBannerBottom] = useState(insets.top + 124);
  const [sheetH, setSheetH] = useState(insets.bottom + 160);

  useEffect(() => {
    session?.update(location);
  }, [session, location]);

  // The position navigation uses (the session ignores a fix saved before it started).
  const fix = snap?.fix ?? null;
  // Draw the island you are on; the destination's when there is no position yet.
  const island: IslandId = (fix ? islandAt(fix) : null) ?? snap?.target?.island ?? 'saipan';
  const graph = roadGraph(island);

  const route = snap?.route ?? null;
  const target = snap?.target ?? null;
  const autoView: NavView = useMemo(() => {
    if (overview && route) {
      const pts: { lat: number; lng: number }[] = [];
      for (let i = 0; i < route.lat.length; i += 4) pts.push({ lat: route.lat[i], lng: route.lng[i] });
      pts.push({ lat: route.end.lat, lng: route.end.lng });
      if (fix) pts.push({ lat: fix.lat, lng: fix.lng });
      if (target) pts.push(target);
      return fitView(pts, width, height, graph.kx, bannerBottom + 12, sheetH + 12);
    }
    const c = fix ?? (route ? { lat: route.lat[0], lng: route.lng[0] } : target ?? { lat: 15.19, lng: 145.75 });
    return { center: { lat: c.lat, lng: c.lng }, mpp: followMpp, anchorY: 0.62 };
  }, [overview, route, target, fix, followMpp, width, height, graph.kx, bannerBottom, sheetH]);
  const view = free ?? autoView;
  const following = !free && !overview;
  const zoomBy = (factor: number) => {
    const mpp = Math.min(MAX_MPP, Math.max(MIN_MPP, view.mpp / factor));
    if (following) setFollowMpp(mpp);
    else {
      setFree({ ...view, mpp });
      setOverview(false);
    }
  };
  const recenter = () => {
    setFree(null);
    setOverview(false);
  };

  const end = () => goBackOr(router, '/shelter');

  if (!session || !snap) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Text style={type.headline}>That place is not on this phone</Text>
        <Button title="Close" style={{ marginTop: 16, alignSelf: 'stretch', marginHorizontal: 24 }} onPress={end} />
      </View>
    );
  }

  const banner = bannerFor(snap, gps);
  const pr = snap.progress;
  const arrived = snap.status === 'arrived';

  return (
    <GestureHandlerRootView style={styles.root} testID="navigate">
      <StatusBar style="dark" />
      <NavMap width={width} height={height} graph={graph} coast={COASTLINES[island]} route={snap.route} along={pr?.along ?? 0} user={fix} destination={snap.target} view={view} bottomInset={sheetH} onInteract={() => setFree((f) => f ?? view)} onViewChange={(update) => {
          setFree((f) => update(f ?? view));
          setOverview(false);
        }} />

      <View
        style={[styles.banner, { top: insets.top + 6 }]}
        onLayout={(e) => setBannerBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${banner.distance && !banner.depart ? `In ${banner.distance}, ` : ''}${banner.text}${banner.distance && banner.depart ? ` for ${banner.distance}` : ''}${banner.detail ? `. ${banner.detail}` : ''}`}>
        <Icon name={banner.icon} size={40} color={colors.white} weight="semibold" />
        <View style={{ flex: 1 }}>
          {banner.distance ? <Text style={[styles.bannerDistance, tabular]}>{banner.distance}</Text> : null}
          <Text style={styles.bannerText}>{banner.text}</Text>
          {banner.detail ? <Text style={styles.bannerDetail}>{banner.detail}</Text> : null}
        </View>
      </View>

      <View style={[styles.controls, { bottom: sheetH + 16 }]}>
        <MapButton icon="plus" label="Zoom in" disabled={view.mpp <= MIN_MPP} onPress={() => zoomBy(ZOOM_STEP)} />
        <MapButton icon="minus" label="Zoom out" disabled={view.mpp >= MAX_MPP} onPress={() => zoomBy(1 / ZOOM_STEP)} />
        {following ? (
          <MapButton icon="map" label="Show the whole route" disabled={!snap.route} onPress={() => setOverview(true)} />
        ) : (
          <MapButton icon="recenter" label="Re-centre on my position" onPress={recenter} />
        )}
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}>
        <View style={styles.sheetRow}>
          <View style={{ flex: 1 }}>
            {arrived ? (
              <Text style={styles.eta}>Arrived</Text>
            ) : pr ? (
              <Text style={[styles.eta, tabular]}>{formatTravelTime(pr.remainingS)}</Text>
            ) : (
              <Text style={styles.eta}>—</Text>
            )}
            <Text style={type.subheadline} numberOfLines={2}>
              {[pr && !arrived ? formatNavDistance(pr.remainingM) : null, snap.target?.name ?? null].filter(Boolean).join(' · ') || 'Nearest shelter on your island'}
            </Text>
          </View>
          <Button title={arrived ? 'Done' : 'End'} variant={arrived ? 'primary' : 'red'} size="sm" onPress={end} style={styles.endButton} testID="navigate-end" />
        </View>
        <Segmented<TravelMode>
          label="Travel mode"
          options={[
            { value: 'drive', label: 'Drive' },
            { value: 'walk', label: 'Walk' },
          ]}
          value={snap.mode}
          onChange={(m) => {
            session.setMode(m);
            setFollowMpp(DEFAULT_MPP[m]);
          }}
        />
        <Text style={[type.footnote, { marginTop: 8 }]}>
          Offline map and route · times are estimates{snap.reroutes ? ` · re-routed ${snap.reroutes}×` : ''}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

function MapButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} style={({ pressed }) => [styles.mapButton, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 }]}>
      <Icon name={icon} size={20} color={colors.tint} weight="semibold" />
    </Pressable>
  );
}

const noopSubscribe = () => () => {};
const nullSnapshot = () => null;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#D7E5F4' },
  center: { alignItems: 'center', justifyContent: 'center' },
  banner: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: palette.navy, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, minHeight: 96 },
  bannerDistance: { color: colors.white, fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  bannerText: { color: colors.white, fontSize: 19, lineHeight: 24, fontWeight: '600', letterSpacing: -0.3 },
  bannerDetail: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 19, marginTop: 3 },
  controls: { position: 'absolute', right: 12, gap: 8 },
  mapButton: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  eta: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  endButton: { minWidth: 88 },
});
