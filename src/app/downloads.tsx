/**
 * S-08 Downloads · offline data manager. Makes "this app works offline" a claim you can verify:
 * what is saved, how big, and when. Also hosts the demo/testing controls (clearly labelled).
 */
import { useState } from 'react';
import { Alert, Platform, Text } from 'react-native';

import faq from '@/assets/data/faq.json';
import rota from '@/assets/data/rota-coastline.json';
import saipan from '@/assets/data/saipan-coastline.json';
import tinian from '@/assets/data/tinian-coastline.json';
import { files } from '@/data/files';
import { resetAllData, shelterRepo } from '@/data/repos';
import { formatChstStamp, isStale, relativeAgo } from '@/domain/time';
import type { DemoScenario } from '@/domain/types';
import { applyDemoScenario } from '@/services/demo';
import { refreshAll, retrySummaries, type RefreshResult } from '@/services/refresh';
import { actions, isOfflineNow, useAppState } from '@/store/appStore';
import { useClock } from '@/store/derived';
import type { IconName } from '@/ui/icons';
import { Button, Callout, Cell, Group, ProgressBar, ProgressRing, SectionFooter, SectionHeader, Segmented, Subhead, Toggle } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, tabular, type } from '@/ui/theme';

const kb = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const DROPPED_LABEL = { forecast: 'the wind forecast', 'alert-history': 'older notices (the newest 10 are kept)' } as const;

export default function DownloadsScreen() {
  const cacheMeta = useAppState((s) => s.cacheMeta);
  const shelters = useAppState((s) => s.shelters);
  const shelterSource = useAppState((s) => s.shelterSource);
  const alerts = useAppState((s) => s.alerts);
  const forecast = useAppState((s) => s.forecast);
  const settings = useAppState((s) => s.settings);
  const offline = useAppState((s) => isOfflineNow(s));
  const refreshing = useAppState((s) => s.refreshing);
  const progress = useAppState((s) => s.refreshProgress);
  const storageNotice = useAppState((s) => s.storageNotice);
  const now = useClock();
  const free = files.availableBytes();
  const freeText = Number.isFinite(free) ? `${kb(free)} free on this phone` : null;
  const [last, setLast] = useState<RefreshResult | null>(null);

  const shelterBytes = shelterSource === 'network' ? shelterRepo.bytes() : JSON.stringify(shelters).length;
  const rows: { key: string; icon: IconName; name: string; size: string; saved: boolean; when: string; stale: boolean }[] = [
    {
      key: 'shelters',
      icon: 'shelter',
      name: 'Shelter list',
      size: kb(shelterBytes),
      saved: true,
      when: shelterSource === 'network' && cacheMeta.shelters?.fetchedAt ? `saved ${relativeAgo(cacheMeta.shelters.fetchedAt)}` : `bundled · v${shelterRepo.bundledVersion()}`,
      stale: shelterSource === 'network' && cacheMeta.shelters?.fetchedAt ? isStale(cacheMeta.shelters.fetchedAt) : false,
    },
    { key: 'map', icon: 'map', name: 'Map · Saipan, Tinian, Rota', size: kb(JSON.stringify(saipan).length + JSON.stringify(tinian).length + JSON.stringify(rota).length), saved: true, when: 'bundled · OpenStreetMap vector coastlines', stale: false },
    {
      key: 'alerts',
      icon: 'alertOutline',
      name: 'Alert history',
      size: kb(JSON.stringify(alerts).length),
      saved: alerts.length > 0 || !!cacheMeta.alerts?.fetchedAt,
      when: cacheMeta.alerts?.fetchedAt ? `${alerts.length === 0 ? 'no notices in force' : `${alerts.length} notice${alerts.length > 1 ? 's' : ''}`} · NWS checked ${relativeAgo(cacheMeta.alerts.fetchedAt)}` : 'not checked yet',
      stale: false,
    },
    {
      key: 'forecast',
      icon: 'wind',
      name: 'Wind forecast (7 days)',
      size: forecast ? kb(JSON.stringify(forecast).length) : '—',
      saved: !!forecast,
      when: cacheMeta.forecast?.fetchedAt ? `saved ${relativeAgo(cacheMeta.forecast.fetchedAt)} · Open-Meteo` : 'not downloaded',
      stale: cacheMeta.forecast?.fetchedAt ? isStale(cacheMeta.forecast.fetchedAt, now, 1) : false,
    },
    { key: 'faq', icon: 'faq', name: 'Offline guidance & FAQ', size: kb(JSON.stringify(faq).length), saved: true, when: 'bundled', stale: false },
  ];
  const savedCount = rows.filter((r) => r.saved).length;
  const allSaved = savedCount === rows.length;

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
    <Screen title="Offline data" largeTitle="Offline data" subtitle="What is saved on this phone, how big, and when">
      <Group style={{ marginTop: 8 }}>
        <Cell
          leading={
            <ProgressRing pct={(savedCount / rows.length) * 100} size={44} stroke={4} color={allSaved ? colors.green : colors.amber}>
              <Text maxFontSizeMultiplier={1.15} style={[styles.ringText, tabular, { color: allSaved ? colors.green : colors.amber }]}>
                {savedCount}/{rows.length}
              </Text>
            </ProgressRing>
          }
          title={allSaved ? 'Everything you need is on this phone' : `${rows.length - savedCount} item${rows.length - savedCount > 1 ? 's' : ''} not saved yet`}
          subtitle={allSaved ? 'Turn on airplane mode and open the app again to check.' : 'Refresh while you have signal.'}
          last
        />
      </Group>
      <Button title={refreshing ? 'Refreshing…' : offline ? 'No signal — will retry automatically' : 'Refresh everything now'} disabled={offline || refreshing} onPress={() => void run()} accessibilityHint="Downloads the latest alerts, forecast and shelter list while you have signal" />
      {refreshing && progress ? (
        <Group padded style={{ marginTop: 10 }}>
          <ProgressBar pct={(progress.done / progress.total) * 100} color={colors.tint} label={`${progress.done} of ${progress.total} downloads finished`} />
          <Text style={[type.footnote, tabular, { marginTop: 8 }]}>{`${progress.done} of ${progress.total} finished${freeText ? ` · ${freeText}` : ''}`}</Text>
        </Group>
      ) : null}
      {last ? <SectionFooter style={{ textAlign: 'center' }}>{`Alerts: ${last.alerts} · Forecast: ${last.forecast === 'low-storage' ? 'not kept (storage almost full)' : last.forecast} · Shelters: ${last.shelters === 'no-source' ? 'bundled (no feed configured)' : last.shelters}`}</SectionFooter> : null}

      {storageNotice ? (
        <Callout icon="alert" tone="amber" title={storageNotice.recovered ? 'Storage is almost full' : 'Storage is full — the last change could not be saved'}>
          <Subhead>
            {storageNotice.dropped.length > 0 ? `To make room the app gave up ${storageNotice.dropped.map((d) => DROPPED_LABEL[d]).join(' and ')}. ` : ''}
            Your household, checklist, shelter list, map and guidance are kept. Free some space, then refresh.
          </Subhead>
          <Button title="OK" variant="tonal" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => actions.dismissStorageNotice()} />
        </Callout>
      ) : null}

      <SectionHeader>Saved items</SectionHeader>
      <Group>
        {rows.map((r, i) => (
          <Cell key={r.key} icon={r.icon} iconColor={r.saved ? (r.stale ? colors.amber : colors.green) : colors.red} title={r.name} subtitle={`${r.size} · ${r.when}${r.stale ? ' · older than expected' : ''}`} value={r.saved ? (r.stale ? 'Old' : 'Saved') : 'Missing'} valueColor={r.saved ? (r.stale ? colors.amber : colors.green) : colors.red} last={i === rows.length - 1} />
        ))}
      </Group>
      <SectionFooter>If storage runs out, the forecast and alert history are dropped first. The shelter list, map and FAQ are kept to the end. Total footprint is under 1 MB.{freeText ? ` ${freeText[0].toUpperCase()}${freeText.slice(1)}.` : ''}</SectionFooter>

      <SectionHeader>Notifications</SectionHeader>
      <Group>
        <Toggle icon="bell" label="Notify me about new NWS alerts" value={settings.notificationsEnabled} onChange={(v) => actions.patchSettings({ notificationsEnabled: v })} hint="Local notifications; sound only for Extreme or Severe" last />
      </Group>

      <SectionHeader>Demo & testing</SectionHeader>
      <Group>
        <Cell
          icon="flask"
          title="Scenario"
          subtitle="Real NWS Tiyan GU text from Super Typhoon Sinlaku (April 2026), times shifted to now"
          trailing={
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
          }
        />
        <Toggle icon="offline" label="Simulate no signal" value={settings.simulateOffline} onChange={(v) => actions.patchSettings({ simulateOffline: v })} hint="Shows the OFFLINE banner and blocks network calls" last />
      </Group>
      <SectionFooter>Demo notices are labelled everywhere they appear. For the real test use airplane mode: quit the app, turn airplane mode on, relaunch. Every tab must still open.</SectionFooter>

      <SectionHeader>About the data</SectionHeader>
      <Group padded>
        <Text style={type.footnote}>Alerts: National Weather Service, api.weather.gov (public domain). Wind forecast: Weather data by Open-Meteo.com (CC BY 4.0). Map: © OpenStreetMap contributors, ODbL 1.0 — openstreetmap.org/copyright. Village points: OpenStreetMap; Chalan Laulau and Fina Sisu from GeoNames.org (CC BY 4.0). Shelters: CNMI HSEM / Joint Information Center announcements. Guidance: FEMA, CDC, American Red Cross, NWS.</Text>
        <Text style={[type.footnote, tabular, { marginTop: 8 }]}>Last NWS check: {cacheMeta.alerts?.fetchedAt ? formatChstStamp(cacheMeta.alerts.fetchedAt) : 'never'}</Text>
      </Group>

      <Button title="Reset app data" variant="secondary" onPress={confirmReset} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = {
  ringText: { fontSize: 11, fontWeight: '600' as const },
};
