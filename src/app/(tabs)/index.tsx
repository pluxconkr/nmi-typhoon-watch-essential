/**
 * S-01 Alert · timeline (tab 1, home). Answers only: how many hours are left, and what to do today.
 * Phase variants: none (calm) · before · during · after. Official text is never shown here (S-02 only).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { waterPointRepo } from '@/data/repos';
import { CONTACTS } from '@/domain/contacts';
import { extractCategory, extractStormName } from '@/domain/nws';
import { formatChst, formatChstStamp, isStale, relativeAgo } from '@/domain/time';
import type { PrepWindow, StoredAlert } from '@/domain/types';
import { AFTER_TASKS, DURING_TASKS, WINDOW_TASKS } from '@/domain/windows';
import { refreshAll } from '@/services/refresh';
import { actions, isOfflineNow, useAppState } from '@/store/appStore';
import { usePhase } from '@/store/derived';
import { AlertHero, Countdown, PlainSummary, TaskRow, WindowTimeline } from '@/ui/alert-widgets';
import { Body, Button, Card, LinkRow, Pill, SectionLabel, Small, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function AlertScreen() {
  const phase = usePhase();
  const alerts = useAppState((s) => s.alerts);
  const taskChecks = useAppState((s) => s.taskChecks);
  const cacheMeta = useAppState((s) => s.cacheMeta);
  const shelterSource = useAppState((s) => s.shelterSource);
  const offline = useAppState((s) => isOfflineNow(s));
  const refreshing = useAppState((s) => s.refreshing);
  const router = useRouter();
  const [preview, setPreview] = useState<PrepWindow | null>(null);

  const primary = phase.primary;
  const isDemo = !!primary?.isDemo;
  const stormName = primary ? extractStormName(primary) : null;
  const category = primary ? extractCategory(primary) : null;
  const sheltersMeta = cacheMeta.shelters;
  const offlineDataReady = shelterSource === 'network' || true; // bundled copy always exists
  const offlineDataSub =
    shelterSource === 'network' && sheltersMeta?.fetchedAt
      ? `Shelters saved · ${relativeAgo(sheltersMeta.fetchedAt)}${isStale(sheltersMeta.fetchedAt) ? ' · older than 7 days' : ''}`
      : 'Map & shelter list bundled with the app · always available offline';

  const pastNotices = (
    <LinkRow title="Past notices" subtitle={`${alerts.length} saved on this phone · readable offline`} onPress={() => router.push('/history')} />
  );

  const offlineData = (
    <LinkRow
      title="Offline data"
      subtitle={offlineDataSub}
      onPress={() => router.push('/downloads')}
      tone={offlineDataReady ? 'green' : 'red'}
      right={<Pill tone={offlineDataReady ? 'green' : 'red'}>{offlineDataReady ? 'Ready' : 'Action'}</Pill>}
    />
  );

  // ---------- DURING ----------
  if (phase.phase === 'during' && primary) {
    return (
      <Screen padded={false} header={<AlertHero kicker={`${(stormName ?? primary.event).toUpperCase()} · SAIPAN${isDemo ? ' · DEMO DATA' : ''}`} title="STAY INSIDE" sub="Damaging winds are happening now" />}>
        <View style={styles.pad}>
          <Card>
            <SectionLabel>Right now</SectionLabel>
            {DURING_TASKS.map((t) => (
              <TaskRow key={t.id} task={t} checked={!!taskChecks[t.id]} onChange={(v) => actions.toggleTask(t.id, v)} />
            ))}
          </Card>
          <Card tone="red">
            <SectionLabel color={colors.red}>If the wind suddenly stops</SectionLabel>
            <Body strong>Do not go outside.</Body>
            <Small style={{ marginTop: 4 }}>You may be in the eye. Wind will return from the opposite direction, often within 20–40 minutes, and it will be just as strong.</Small>
          </Card>
          <LinkRow title="What do I do if…" subtitle="6 situations · works with no signal" onPress={() => router.push('/faq')} />
          <EmergencyNumbers />
          <Card>
            <SectionLabel>Preparation checklist</SectionLabel>
            <Xs style={{ marginBottom: 9 }}>Shopping and travel items are hidden during the storm. What you already have is still listed for reference.</Xs>
            <Button title="View what I already have →" variant="ghost" onPress={() => router.push('/checklist')} />
          </Card>
          <OfficialLink alert={primary} />
          {pastNotices}
        </View>
      </Screen>
    );
  }

  // ---------- AFTER ----------
  if (phase.phase === 'after' && primary) {
    return (
      <Screen padded={false} header={<AlertHero tone="navy" kicker={`ALL CLEAR DECLARED · ${phase.endedAt ? formatChstStamp(phase.endedAt) : ''}${isDemo ? ' · DEMO DATA' : ''}`} title="The storm has passed" sub="Hazards remain. Most injuries happen now." />}>
        <View style={styles.pad}>
          <Card>
            <SectionLabel>Before you go outside</SectionLabel>
            {AFTER_TASKS.map((t) => (
              <TaskRow key={t.id} task={t} checked={!!taskChecks[t.id]} onChange={(v) => actions.toggleTask(t.id, v)} />
            ))}
          </Card>
          <WaterPoints />
          <Card tone="dashed">
            <SectionLabel>Report damage · Request help · Find volunteers</SectionLabel>
            <Small>These need a network connection, so they are not part of this app.</Small>
            <Xs style={{ marginTop: 6 }}>After Sinlaku, 52 of Saipan&apos;s 74 cell sites were down. Features that need a network are not placed at the moment there is none. Instead: HSEM contacts and what FEMA will ask for, all offline.</Xs>
            <Button title="What FEMA will ask for →" variant="ghost" style={{ marginTop: 11 }} onPress={() => router.push('/faq?section=after')} />
          </Card>
          <EmergencyNumbers />
          <OfficialLink alert={primary} />
          {pastNotices}
        </View>
      </Screen>
    );
  }

  // ---------- BEFORE ----------
  if (phase.phase === 'before' && primary) {
    const current = preview ?? phase.window ?? '72h';
    const tasks = WINDOW_TASKS[current];
    const kicker = `${category ? `${category} · ` : ''}${primary.event.toUpperCase()} · ${primary.areaDesc.replace(/, MP/g, '').toUpperCase()}${isDemo ? ' · DEMO DATA' : ''}`;
    return (
      <Screen
        padded={false}
        header={<AlertHero kicker={kicker} title={stormName ?? primary.event} sub={offline ? `Received ${formatChstStamp(primary.receivedAt)} · no new data since` : `Issued ${formatChstStamp(primary.sent)} · ${primary.senderName}`} />}>
        <View style={styles.pad}>
          <Card>
            {phase.target ? (
              <Countdown target={phase.target} label={`until damaging winds · ${formatChst(phase.target)}${phase.targetSource === 'open-meteo' ? ' · estimated from forecast wind' : ''}`} />
            ) : (
              <Body strong>Timing not yet available — prepare now.</Body>
            )}
            <SectionLabel style={{ marginTop: 16, marginBottom: 0 }}>Preparation window</SectionLabel>
            <WindowTimeline current={current} forced={preview} onSelect={(w) => setPreview(w === (phase.window ?? '72h') ? null : w)} />
          </Card>
          <Card>
            <SectionLabel>Do these 3 today</SectionLabel>
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} checked={!!taskChecks[t.id]} onChange={(v) => actions.toggleTask(t.id, v)} />
            ))}
          </Card>
          <Card>
            <PlainSummary summary={primary.plainSummary ?? primary.headline} status={primary.plainSummary ? 'ok' : primary.summaryStatus} generatedAt={primary.summaryAt} isDemo={isDemo} />
            <Button title="See the official alert text →" variant="ghost" style={{ marginTop: 11 }} onPress={() => router.push({ pathname: '/alert/[id]', params: { id: primary.alertId } })} />
          </Card>
          {pastNotices}
          {offlineData}
        </View>
      </Screen>
    );
  }

  // ---------- NONE (calm) ----------
  const latest = alerts[0];
  return (
    <Screen padded={false} header={<AlertHero tone="navy" kicker="COMMONWEALTH OF THE NORTHERN MARIANA ISLANDS · SAIPAN" title="No active typhoon alert" sub={cacheMeta.alerts?.fetchedAt ? `NWS checked ${relativeAgo(cacheMeta.alerts.fetchedAt)}` : offline ? 'No signal · showing saved data' : 'Not checked yet'} />}>
      <View style={styles.pad}>
        <Card tone="green">
          <SectionLabel color={colors.green}>Calm weather is when you prepare</SectionLabel>
          <Body strong>Everything below works with no signal once it is on this phone.</Body>
          <Xs style={{ marginTop: 6 }}>During Sinlaku (April 2026) 70% of Saipan&apos;s cell sites went dark for lack of power. What you save now is what you will have then.</Xs>
        </Card>
        {offlineData}
        <LinkRow title="Preparation checklist" subtitle="Quantities computed for your household" onPress={() => router.push('/checklist')} />
        <LinkRow title="Nearest shelters" subtitle="Offline map and landmark directions" onPress={() => router.push('/shelter')} />
        {latest ? (
          <Card>
            <SectionLabel>Latest notice</SectionLabel>
            <Text style={styles.latestTitle}>{latest.event}{latest.isDemo ? ' · demo' : ''}</Text>
            <Small style={{ marginTop: 3 }}>{latest.plainSummary ?? latest.headline ?? latest.areaDesc}</Small>
            <Xs style={{ marginTop: 5, fontFamily: undefined }}>{formatChstStamp(latest.sent)}</Xs>
          </Card>
        ) : null}
        {pastNotices}
        <Button title={refreshing ? 'Checking NWS…' : offline ? 'No signal — will check automatically' : 'Check NWS now'} variant="ghost" disabled={offline || refreshing} onPress={() => void refreshAll()} />
        <Xs style={{ textAlign: 'center', marginTop: 10 }}>Alerts: NWS Tiyan GU (api.weather.gov). Wind forecast: Weather data by Open-Meteo.com.</Xs>
      </View>
    </Screen>
  );
}

function OfficialLink({ alert }: { alert: StoredAlert }) {
  const router = useRouter();
  return <LinkRow title="Official alert text" subtitle={`${alert.event} · ${formatChstStamp(alert.sent)}`} onPress={() => router.push({ pathname: '/alert/[id]', params: { id: alert.alertId } })} />;
}

export function EmergencyNumbers() {
  return (
    <Card tone="navy">
      <SectionLabel color={colors.navyMuted}>Emergency numbers</SectionLabel>
      {CONTACTS.map((c) => (
        <View key={c.id} style={{ marginBottom: 8 }}>
          <Text style={styles.numBig}>{c.display}</Text>
          <Xs style={{ color: colors.navyMuted }}>
            {c.label} · {c.note}
          </Xs>
        </View>
      ))}
      <Xs style={{ color: '#7FA5D0', marginTop: 2 }}>Text first — texts often get through when calls and data do not. These numbers are stored in the app.</Xs>
    </Card>
  );
}

function WaterPoints() {
  const { points: wp, lastVerified } = waterPointRepo.get();
  return (
    <Card>
      <SectionLabel>Water & supply points</SectionLabel>
      {wp.length === 0 ? (
        <Small>No water distribution points have been published for this storm yet. When signal returns, the list is refreshed; until then use stored or boiled water.</Small>
      ) : (
        wp.map((p) => (
          <View key={p.id} style={styles.wp}>
            <View style={styles.wpIcon}>
              <Text style={styles.wpIconText}>W</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wpName}>{p.name}</Text>
              <Xs>{p.village} · {p.hours}</Xs>
              {p.note ? <Xs>{p.note}</Xs> : null}
            </View>
          </View>
        ))
      )}
      <Xs style={{ marginTop: 9 }}>
        <Xs style={{ fontWeight: '800', color: colors.ink }}>Saved {lastVerified}.</Xs> Water points change often. This screen shows the last information received.
      </Xs>
    </Card>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 16 },
  latestTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  numBig: { fontSize: 20, fontWeight: '800', color: colors.white, fontVariant: ['tabular-nums'] },
  wp: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  wpIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  wpIconText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  wpName: { fontSize: 15, fontWeight: '700', color: colors.ink },
});
