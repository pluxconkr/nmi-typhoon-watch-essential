/**
 * Settings: how often the app checks NWS, notifications, and the clearly labelled demo controls.
 */
import { Text } from 'react-native';

import { DEMO_POSITION_IDS, demoPositionLabel } from '@/domain/demoPositions';
import { AUTO_STORM_MIN, BACKGROUND_MIN, POLL_CHOICES, describeEvery, pollMinutes } from '@/domain/polling';
import { relativeAgo, toEpoch } from '@/domain/time';
import type { DemoPositionId, DemoScenario, PollInterval } from '@/domain/types';
import { applyDemoScenario } from '@/services/demo';
import { setDemoPosition } from '@/services/location';
import { actions, useAppState } from '@/store/appStore';
import { useClock, usePhase } from '@/store/derived';
import { Cell, Group, SectionFooter, SectionHeader, Segmented, Toggle } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

export default function SettingsScreen() {
  const settings = useAppState((s) => s.settings);
  const fetchedAt = useAppState((s) => s.cacheMeta.alerts?.fetchedAt ?? null);
  const { phase, primary } = usePhase();
  const now = useClock(15_000);
  const minutes = pollMinutes(settings.pollInterval, phase);
  const storm = phase === 'before' || phase === 'during';
  const lastCheck = fetchedAt ? toEpoch(fetchedAt) : null;
  const nextIn = lastCheck === null ? 0 : Math.max(0, Math.ceil((lastCheck + minutes * 60_000 - now) / 60_000));
  const status = [
    `Now: ${describeEvery(minutes).toLowerCase()}${settings.pollInterval === 'auto' ? (storm ? ` — ${primary?.event ?? 'storm alert'} in effect` : ' — no storm alert') : ''}.`,
    lastCheck === null ? 'Not checked yet.' : `Last checked ${relativeAgo(lastCheck, now)}; next ${nextIn === 0 ? 'now' : `in about ${nextIn} min`}.`,
  ].join(' ');
  const label = (c: PollInterval) => (c === 'auto' ? 'Automatic' : describeEvery(c));

  const positionRows: { id: DemoPositionId | null; label: string }[] = [{ id: null, label: 'Off — use GPS' }, ...DEMO_POSITION_IDS.map((id) => ({ id, label: demoPositionLabel(id) }))];

  return (
    <Screen title="Settings" largeTitle="Settings" testID="settings">
      <SectionHeader>Check for new alerts</SectionHeader>
      <Group>
        {POLL_CHOICES.map((c, i) => (
          <Cell
            key={String(c)}
            icon={c === 'auto' ? 'storm' : 'clock'}
            iconColor={settings.pollInterval === c ? undefined : colors.ink2}
            title={label(c)}
            subtitle={c === 'auto' ? `Every hour; every ${AUTO_STORM_MIN} minutes from Before until a storm alert ends (recommended)` : undefined}
            accessory={settings.pollInterval === c ? 'check' : 'none'}
            onPress={() => actions.patchSettings({ pollInterval: c })}
            accessibilityRole="button"
            accessibilityState={{ selected: settings.pollInterval === c }}
            last={i === POLL_CHOICES.length - 1}
          />
        ))}
      </Group>
      <SectionFooter>
        {status} While the app is open it checks on this schedule. In the background iOS and Android decide when apps may run — at most about every {BACKGROUND_MIN} minutes — so faster settings apply while the app is open.
      </SectionFooter>

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

      <SectionHeader>Demo GPS position</SectionHeader>
      <Group>
        {positionRows.map((row, i) => (
          <Cell
            key={row.id ?? 'off'}
            title={<Text style={type.body}>{row.label}</Text>}
            accessory={settings.demoPosition === row.id ? 'check' : 'none'}
            onPress={() => setDemoPosition(row.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: settings.demoPosition === row.id }}
            last={i === positionRows.length - 1}
          />
        ))}
      </Group>
      <SectionFooter>For showing directions away from the islands. While a demo position is on, real GPS is not used and the position is labelled “Demo position” everywhere.</SectionFooter>
    </Screen>
  );
}
