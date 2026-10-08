/**
 * S-01 Alert · timeline (tab 1, home). Answers only: how many hours are left, and what to do today.
 * Phase variants: none (calm) · before · during · after. Official text is never shown here (S-02 only).
 * Layout follows Apple Weather: large title, one alert row with a chevron, then grouped content.
 */
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { waterPointRepo } from '@/data/repos';
import { CONTACTS } from '@/domain/contacts';
import { extractCategory, extractStormName } from '@/domain/nws';
import { formatChstShort, formatChstStamp, isStale, relativeAgo } from '@/domain/time';
import type { PrepWindow, StoredAlert } from '@/domain/types';
import { AFTER_TASKS, DURING_TASKS, WINDOW_TASKS } from '@/domain/windows';
import { applyDemoScenario } from '@/services/demo';
import { refreshAll } from '@/services/refresh';
import { actions, isOfflineNow, useAppState } from '@/store/appStore';
import { usePhase } from '@/store/derived';
import { Countdown, PlainSummary, TaskRow, WindowTimeline } from '@/ui/alert-widgets';
import type { IconName } from '@/ui/icons';
import { Button, Callout, Cell, Group, SectionFooter, SectionHeader, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, tabular, type } from '@/ui/theme';

/** "CUC station – Puerto Rico (Puerto Rico Road, in front of …)" → ["CUC station – Puerto Rico", "Puerto Rico Road, in front of …"] */
const splitName = (n: string): [string, string | null] => {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(n);
  return m ? [m[1], m[2]] : [n, null];
};
const pretty = (s: string) => s.replace(/, MP/g, '').replace(/;\s*/g, ', ');
const DEMO_NOTE = 'Demo data · real NWS Tiyan GU text from April 2026, times shifted to now';

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

  // Deep-link scenario switch for demos and testing: nmityphoonwatch://?demo=before|during|after|live
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  useEffect(() => {
    if (demo === 'before' || demo === 'during' || demo === 'after' || demo === 'live' || demo === 'calm') applyDemoScenario(demo);
  }, [demo]);

  const primary = phase.primary;
  const isDemo = !!primary?.isDemo;
  const note = isDemo ? DEMO_NOTE : undefined;
  const stormName = primary ? extractStormName(primary) : null;
  const category = primary ? extractCategory(primary) : null;
  const sheltersMeta = cacheMeta.shelters;
  const offlineDataSub =
    shelterSource === 'network' && sheltersMeta?.fetchedAt
      ? `Shelters saved ${relativeAgo(sheltersMeta.fetchedAt)}${isStale(sheltersMeta.fetchedAt) ? ' · older than 7 days' : ''}`
      : 'Map, shelters and guidance are on this phone';
  const issued = primary ? (offline ? `Received ${formatChstStamp(primary.receivedAt)} · no new data since` : `Issued ${formatChstStamp(primary.sent)} · ${primary.senderName}`) : '';

  const moreGroup = (
    <>
      <SectionHeader>More</SectionHeader>
      <Group>
        <Cell icon="history" title="Past notices" subtitle={`${alerts.length} saved on this phone · readable offline`} accessory="chevron" onPress={() => router.push('/history')} />
        <Cell icon="download" iconColor={colors.green} title="Offline data" subtitle={offlineDataSub} value="Ready" valueColor={colors.green} accessory="chevron" onPress={() => router.push('/downloads')} />
        <Cell icon="settings" title="Settings" subtitle="Alert checks, notifications, demo & testing" accessory="chevron" onPress={() => router.push('/settings')} last />
      </Group>
    </>
  );

  // ---------- DURING ----------
  if (phase.phase === 'during' && primary) {
    return (
      <Screen key="during" largeTitle="Stay inside" subtitle="Damaging winds are happening now. Do not go outside for any reason." note={note}>
        <Group style={{ marginTop: 8 }}>
          <AlertRow alert={primary} icon="alert" color={colors.red} title={`${primary.event}${stormName ? ` · ${stormName}` : ''}`} subtitle={`${pretty(primary.areaDesc)} · Issued ${formatChstShort(primary.sent)}`} last />
        </Group>
        <SectionHeader>Right now</SectionHeader>
        <Group>
          {DURING_TASKS.map((t, i) => (
            <TaskRow key={t.id} task={t} checked={!!taskChecks[t.id]} onChange={(v) => actions.toggleTask(t.id, v)} last={i === DURING_TASKS.length - 1} />
          ))}
        </Group>
        <Callout icon="eye" tone="red" title="If the wind suddenly stops">
          <Text style={type.headline}>Do not go outside.</Text>
          <Subhead style={{ marginTop: 2 }}>You may be in the eye. Wind will return from the opposite direction, often within 20–40 minutes, and it will be just as strong.</Subhead>
        </Callout>
        <SectionHeader>Help</SectionHeader>
        <Group>
          <Cell icon="faq" title="What do I do if…" subtitle="6 situations · works with no signal" accessory="chevron" onPress={() => router.push('/faq')} />
          <Cell icon="checklist" title="What I already have" subtitle="Shopping and travel items are hidden during the storm" accessory="chevron" onPress={() => router.push('/checklist')} last />
        </Group>
        <EmergencyNumbers />
        <SectionHeader>More</SectionHeader>
        <Group>
          <Cell icon="history" title="Past notices" subtitle={`${alerts.length} saved on this phone`} accessory="chevron" onPress={() => router.push('/history')} />
          <Cell icon="settings" title="Settings" subtitle="Alert checks, notifications, demo & testing" accessory="chevron" onPress={() => router.push('/settings')} last />
        </Group>
      </Screen>
    );
  }

  // ---------- AFTER ----------
  if (phase.phase === 'after' && primary) {
    return (
      <Screen key="after" largeTitle="The storm has passed" subtitle="Hazards remain. Most injuries happen now — from wires, water and cleanup." note={note}>
        <Group style={{ marginTop: 8 }}>
          <AlertRow alert={primary} icon="checkCircle" color={colors.green} title={`All clear${phase.endedAt ? ` · ${formatChstStamp(phase.endedAt)}` : ''}`} subtitle={`${primary.event} cancelled · ${pretty(primary.areaDesc)}`} last />
        </Group>
        <SectionHeader>Before you go outside</SectionHeader>
        <Group>
          {AFTER_TASKS.map((t, i) => (
            <TaskRow key={t.id} task={t} checked={!!taskChecks[t.id]} onChange={(v) => actions.toggleTask(t.id, v)} last={i === AFTER_TASKS.length - 1} />
          ))}
        </Group>
        <WaterPoints />
        <SectionHeader>Report damage · Request help · Find volunteers</SectionHeader>
        <Group padded>
          <Text style={type.body}>These need a network connection, so they are not part of this app.</Text>
          <Text style={[type.footnote, { marginTop: 6 }]}>After Sinlaku, 52 of Saipan&apos;s 74 cell sites were down. Features that need a network are not placed at the moment there is none. Instead: HSEM contacts and what FEMA will ask for, all offline.</Text>
          <Button title="What FEMA will ask for" variant="secondary" style={{ marginTop: 12 }} onPress={() => router.push('/faq?section=after')} />
        </Group>
        <EmergencyNumbers />
        <SectionHeader>More</SectionHeader>
        <Group>
          <Cell icon="history" title="Past notices" subtitle={`${alerts.length} saved on this phone`} accessory="chevron" onPress={() => router.push('/history')} />
          <Cell icon="settings" title="Settings" subtitle="Alert checks, notifications, demo & testing" accessory="chevron" onPress={() => router.push('/settings')} last />
        </Group>
      </Screen>
    );
  }

  // ---------- BEFORE ----------
  if (phase.phase === 'before' && primary) {
    const current = preview ?? phase.window ?? '72h';
    const tasks = WINDOW_TASKS[current];
    return (
      <Screen key="before" largeTitle={stormName ?? primary.event} subtitle={issued} note={note}>
        <Group style={{ marginTop: 8 }}>
          <AlertRow alert={primary} icon="alert" color={colors.red} title={[primary.event, category].filter(Boolean).join(' · ')} subtitle={pretty(primary.areaDesc)} last />
        </Group>

        <Group padded>
          {phase.target ? <Countdown target={phase.target} source={phase.targetSource} /> : <Text style={type.headline}>Timing not yet available — prepare now.</Text>}
          <View style={styles.hr} />
          <Text style={type.sectionHeader}>Preparation window</Text>
          <WindowTimeline current={current} forced={preview} onSelect={(w) => setPreview(w === (phase.window ?? '72h') ? null : w)} />
        </Group>

        <SectionHeader>Do these 3 today</SectionHeader>
        <Group>
          {tasks.map((t, i) => (
            <TaskRow key={t.id} task={t} checked={!!taskChecks[t.id]} onChange={(v) => actions.toggleTask(t.id, v)} last={i === tasks.length - 1} />
          ))}
        </Group>

        <SectionHeader>In plain words</SectionHeader>
        <Group padded>
          <PlainSummary summary={primary.plainSummary ?? primary.headline} status={primary.plainSummary ? 'ok' : primary.summaryStatus} generatedAt={primary.summaryAt} isDemo={isDemo} />
        </Group>
        {moreGroup}
      </Screen>
    );
  }

  // ---------- NONE (calm) ----------
  const latest = alerts[0];
  return (
    <Screen key="calm" largeTitle="Alert" status testID="alert-calm">
      <Group style={{ marginTop: 8 }}>
        <Cell icon="checkCircle" iconColor={colors.green} title="No active typhoon alert" subtitle="Saipan · Tinian · Rota" last />
      </Group>
      <SectionFooter>Calm weather is when you prepare. During Sinlaku (April 2026), 70% of Saipan&apos;s cell sites went dark for lack of power. What you save now is what you will have then.</SectionFooter>

      <SectionHeader>Get ready</SectionHeader>
      <Group>
        <Cell icon="download" iconColor={colors.green} title="Offline data" subtitle={offlineDataSub} value="Ready" valueColor={colors.green} accessory="chevron" onPress={() => router.push('/downloads')} />
        <Cell icon="checklist" title="Preparation checklist" subtitle="Quantities computed for your household" accessory="chevron" onPress={() => router.push('/checklist')} />
        <Cell icon="shelter" title="Nearest shelters" subtitle="Offline map and landmark directions" accessory="chevron" onPress={() => router.push('/shelter')} last />
      </Group>

      <SectionHeader right={cacheMeta.alerts?.fetchedAt ? `Checked ${relativeAgo(cacheMeta.alerts.fetchedAt)}` : undefined}>Notices</SectionHeader>
      <Group>
        {latest ? (
          <Cell
            icon="alertOutline"
            iconColor={latest.severity === 'Extreme' ? colors.red : colors.ink2}
            title={`${latest.event}${latest.isDemo ? ' · demo' : ''}`}
            subtitle={
              <View>
                <Subhead style={{ marginTop: 2 }}>{latest.plainSummary ?? latest.headline ?? latest.areaDesc}</Subhead>
                <Text style={[type.footnote, tabular, { marginTop: 4 }]}>{formatChstStamp(latest.sent)}</Text>
              </View>
            }
            accessory="chevron"
            onPress={() => router.push({ pathname: '/alert/[id]', params: { id: latest.alertId } })}
          />
        ) : (
          <Cell icon="history" iconColor={colors.ink2} title="No notices yet" subtitle="When the phone is online the app checks NWS for CNMI alerts and keeps every one here, readable offline." />
        )}
        <Cell icon="history" title="Past notices" subtitle={`${alerts.length} saved on this phone · readable offline`} accessory="chevron" onPress={() => router.push('/history')} />
        <Cell icon="settings" title="Settings" subtitle="Alert checks, notifications, demo & testing" accessory="chevron" onPress={() => router.push('/settings')} last />
      </Group>
      <Button title={refreshing ? 'Checking NWS…' : offline ? 'No signal — will check automatically' : 'Check NWS now'} variant="secondary" disabled={offline || refreshing} onPress={() => void refreshAll()} style={{ marginTop: 6 }} />
      <SectionFooter style={{ textAlign: 'center' }}>Alerts: NWS Tiyan GU (api.weather.gov) · Wind: Weather data by Open-Meteo.com</SectionFooter>
    </Screen>
  );
}

/** The one alert row at the top of an active phase: coloured icon, event, areas, chevron to the official text. */
function AlertRow({ alert, icon, color, title, subtitle, last }: { alert: StoredAlert; icon: IconName; color: string; title: string; subtitle: string; last?: boolean }) {
  const router = useRouter();
  return <Cell icon={icon} iconColor={color} title={title} subtitle={subtitle} accessory="chevron" onPress={() => router.push({ pathname: '/alert/[id]', params: { id: alert.alertId } })} accessibilityLabel={`${title}. ${subtitle}. Official alert text`} last={last} />;
}

async function dial(e164: string) {
  try {
    await Linking.openURL(`tel:${e164}`);
  } catch {
    /* no dialler */
  }
}

export function EmergencyNumbers() {
  return (
    <>
      <SectionHeader>Emergency numbers</SectionHeader>
      <Group>
        {CONTACTS.map((c, i) => (
          <Cell key={c.id} icon="phone" title={c.label} subtitle={c.note} value={c.display} valueColor={colors.tint} onPress={() => void dial(c.e164)} accessibilityRole="link" accessibilityLabel={`Call ${c.label} ${c.display}`} last={i === CONTACTS.length - 1} />
        ))}
      </Group>
      <SectionFooter>Text first — texts often get through when calls and data do not. These numbers are stored in the app.</SectionFooter>
    </>
  );
}

function WaterPoints() {
  const { points: wp, lastVerified } = waterPointRepo.get();
  return (
    <>
      <SectionHeader right={`Saved ${lastVerified}`}>Water & supply points</SectionHeader>
      <Group>
        {wp.length === 0 ? (
          <Cell icon="water" iconColor={colors.ink2} title="No water points published yet" subtitle="When signal returns the list is refreshed; until then use stored or boiled water." last />
        ) : (
          wp.map((p, i) => {
            const [name, where] = splitName(p.name);
            return <Cell key={p.id} icon="water" title={name} subtitle={[where, p.village, p.hours].filter(Boolean).join(' · ')} last={i === wp.length - 1} />;
          })
        )}
      </Group>
      <SectionFooter>Water points change often. This screen shows the last information received.</SectionFooter>
    </>
  );
}

const styles = StyleSheet.create({
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 14 },
});
