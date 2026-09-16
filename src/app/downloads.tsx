/**
 * S-08 Downloads · offline data manager. Makes "this app works offline" a claim you can verify:
 * what is saved, how big, and when. Also hosts the demo/testing controls (clearly labelled).
 */
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import faq from '@/assets/data/faq.json';
import saipan from '@/assets/data/saipan-coastline.json';
import { resetAllData, shelterRepo } from '@/data/repos';
import { formatChstStamp, isStale, relativeAgo } from '@/domain/time';
import type { DemoScenario } from '@/domain/types';
import { applyDemoScenario } from '@/services/demo';
import { refreshAll, retrySummaries, type RefreshResult } from '@/services/refresh';
import { actions, isOfflineNow, useAppState } from '@/store/appStore';
import { useClock } from '@/store/derived';
import { Button, Card, Pill, ProgressBar, SectionLabel, Segmented, Small, Toggle, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function DownloadsScreen() {
  const cacheMeta = useAppState((s) => s.cacheMeta);
  const shelters = useAppState((s) => s.shelters);
  const shelterSource = useAppState((s) => s.shelterSource);
  const alerts = useAppState((s) => s.alerts);
  const forecast = useAppState((s) => s.forecast);
  const settings = useAppState((s) => s.settings);
  const offline = useAppState((s) => isOfflineNow(s));
  const refreshing = useAppState((s) => s.refreshing);
  const now = useClock();
  const [last, setLast] = useState<RefreshResult | null>(null);

  const shelterBytes = shelterSource === 'network' ? shelterRepo.bytes() : JSON.stringify(shelters).length;
  const alertBytes = JSON.stringify(alerts).length;
  const forecastBytes = forecast ? JSON.stringify(forecast).length : 0;
  const mapBytes = JSON.stringify(saipan).length;
  const faqBytes = JSON.stringify(faq).length;

  const rows = [
    {
      key: 'shelters',
      name: 'Shelter list',
      size: kb(shelterBytes),
      status: 'saved' as const,
      when: shelterSource === 'network' && cacheMeta.shelters?.fetchedAt ? `saved · ${relativeAgo(cacheMeta.shelters.fetchedAt)}` : `bundled with the app · v${shelterRepo.bundledVersion()}`,
      note: shelterSource === 'network' ? 'Downloaded from the configured HSEM feed. A bundled copy also ships with the app.' : 'Built-in copy. Refreshes from the HSEM feed when one is configured.',
      stale: shelterSource === 'network' && cacheMeta.shelters?.fetchedAt ? isStale(cacheMeta.shelters.fetchedAt) : false,
    },
    {
      key: 'map',
      name: 'Map · Saipan coastline (vector)',
      size: kb(mapBytes),
      status: 'saved' as const,
      when: 'bundled',
      note: 'Drawn from OpenStreetMap data inside the app. No tiles, no downloads, no signal needed.',
      stale: false,
    },
    {
      key: 'alerts',
      name: 'Alert history',
      size: kb(alertBytes),
      status: alerts.length > 0 ? ('saved' as const) : ('none' as const),
      when: cacheMeta.alerts?.fetchedAt ? `NWS checked · ${relativeAgo(cacheMeta.alerts.fetchedAt)}` : 'not checked yet',
      note: `${alerts.length} notices kept (last 50 or 90 days). Official text and summaries stored together.`,
      stale: false,
    },
    {
      key: 'forecast',
      name: 'Wind forecast (7 days)',
      size: forecast ? kb(forecastBytes) : '—',
      status: forecast ? ('saved' as const) : ('none' as const),
      when: cacheMeta.forecast?.fetchedAt ? `saved · ${relativeAgo(cacheMeta.forecast.fetchedAt)}` : 'not downloaded',
      note: 'Weather data by Open-Meteo.com. Used only to estimate when damaging winds begin.',
      stale: cacheMeta.forecast?.fetchedAt ? isStale(cacheMeta.forecast.fetchedAt, now, 1) : false,
    },
    {
      key: 'faq',
      name: 'Offline guidance & FAQ',
      size: kb(faqBytes),
      status: 'saved' as const,
      when: 'bundled',
      note: 'Ships inside the app, always present.',
      stale: false,
    },
  ];
  const savedCount = rows.filter((r) => r.status === 'saved').length;

  const run = async () => {
    const r = await refreshAll();
    setLast(r);
    void retrySummaries();
  };

  const confirmReset = () => {
    const doReset = () => {
      resetAllData();
      actions.rehydrate();
    };
    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' ? globalThis.confirm('Erase all saved data on this device?') : true) doReset();
      return;
    }
    Alert.alert('Reset app data', 'Erase household, checklist, alert history and downloads on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: doReset },
    ]);
  };

  return (
    <Screen title="Offline data">
      <Pill tone="navy" style={{ marginBottom: 10 }}>
        S-08
      </Pill>
      <Xs style={{ marginBottom: 12 }}>This screen turns &quot;the app works offline&quot; into something you can see: what is saved, how big it is, and when.</Xs>

      <Card>
        <View style={styles.head}>
          <SectionLabel style={{ marginBottom: 0 }}>Saved on this phone</SectionLabel>
          <Text style={[styles.count, { color: savedCount === rows.length ? colors.green : colors.amber }]}>
            {savedCount} / {rows.length}
          </Text>
        </View>
        <ProgressBar pct={(savedCount / rows.length) * 100} color={savedCount === rows.length ? colors.green : colors.amber} />
      </Card>

      {rows.map((r) => (
        <Card key={r.key} tone={r.stale ? 'amber' : 'default'}>
          <View style={styles.rowHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{r.name}</Text>
              <Xs>
                {r.size} · {r.when}
              </Xs>
              <Xs style={{ marginTop: 3 }}>{r.note}</Xs>
              {r.stale ? <Xs style={{ marginTop: 3, color: colors.amber, fontWeight: '800' }}>Older than expected — refresh when you have signal.</Xs> : null}
            </View>
            <Pill tone={r.status === 'saved' ? 'green' : 'red'}>{r.status === 'saved' ? 'Saved' : 'Missing'}</Pill>
          </View>
        </Card>
      ))}

      <Button
        title={refreshing ? 'Refreshing…' : offline ? 'No signal — will retry automatically' : 'Refresh everything now'}
        disabled={offline || refreshing}
        onPress={() => void run()}
        accessibilityHint="Downloads the latest alerts, forecast and shelter list while you have signal"
      />
      {last ? (
        <Xs style={{ marginTop: 8, textAlign: 'center' }}>
          Alerts: {last.alerts} · Forecast: {last.forecast} · Shelters: {last.shelters === 'no-source' ? 'bundled (no feed configured)' : last.shelters}
        </Xs>
      ) : null}
      {savedCount === rows.length ? (
        <Card tone="green" style={{ marginTop: 11 }}>
          <Small style={{ fontWeight: '800', color: colors.green }}>✓ Everything you need is on this phone</Small>
          <Xs style={{ marginTop: 4 }}>Turn on airplane mode and open the app again to check.</Xs>
        </Card>
      ) : null}

      <Card tone="muted" style={{ marginTop: 11 }}>
        <SectionLabel>If storage runs out</SectionLabel>
        <Xs>The forecast and alert history are dropped first. The shelter list, the map and the FAQ are kept to the end — the app is usable without a forecast, but not without shelter addresses. Total footprint is under 1 MB.</Xs>
      </Card>

      <Card>
        <SectionLabel>Notifications</SectionLabel>
        <Toggle label="Notify me about new NWS alerts" value={settings.notificationsEnabled} onChange={(v) => actions.patchSettings({ notificationsEnabled: v })} hint="Local notifications; sound only for Extreme or Severe" />
      </Card>

      <Card tone="amber">
        <SectionLabel color={colors.amber}>Demo & testing</SectionLabel>
        <Xs style={{ marginBottom: 8 }}>Scenarios use real NWS Tiyan GU text from Super Typhoon Sinlaku (April 2026) with times shifted to now. Demo notices are labelled everywhere they appear.</Xs>
        <Segmented<DemoScenario>
          label="Demo scenario"
          options={[
            { value: 'live', label: 'Live' },
            { value: 'before', label: 'Before' },
            { value: 'during', label: 'During' },
            { value: 'after', label: 'After' },
          ]}
          value={settings.demoScenario}
          onChange={(v) => applyDemoScenario(v)}
        />
        <View style={{ marginTop: 6 }}>
          <Toggle label="Simulate no signal" value={settings.simulateOffline} onChange={(v) => actions.patchSettings({ simulateOffline: v })} hint="Shows the OFFLINE banner and blocks network calls in the app" />
        </View>
        <Xs style={{ marginTop: 6 }}>For the real test, use airplane mode: quit the app, turn airplane mode on, relaunch. Every tab must still open.</Xs>
      </Card>

      <Card tone="muted">
        <SectionLabel>About the data</SectionLabel>
        <Xs>Alerts: National Weather Service, api.weather.gov (public domain). Wind forecast: Weather data by Open-Meteo.com (CC BY 4.0). Map: © OpenStreetMap contributors, ODbL 1.0 — openstreetmap.org/copyright. Village points: OpenStreetMap; Chalan Laulau and Fina Sisu from GeoNames.org (CC BY 4.0). Shelters: CNMI HSEM / Joint Information Center announcements. Guidance: FEMA, CDC, American Red Cross, NWS.</Xs>
        <Text style={styles.stamp}>Last app data check: {cacheMeta.alerts?.fetchedAt ? formatChstStamp(cacheMeta.alerts.fetchedAt) : 'never'}</Text>
      </Card>

      <Button title="Reset app data" variant="ghost" onPress={confirmReset} />
      <View style={{ height: 12 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  count: { fontFamily: fonts.mono, fontSize: 15, fontWeight: '800' },
  rowHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  stamp: { fontFamily: fonts.mono, fontSize: 11, color: colors.ink3, marginTop: 6 },
});
