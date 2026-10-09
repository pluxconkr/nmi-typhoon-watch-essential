/**
 * S-02 Alert detail: what you need to know (big, plain, from the alert's own fields), then the one-sentence
 * summary, then the official text and where it came from. Neither summary replaces the official text.
 */
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { alertEssentials } from '@/domain/essentials';
import { isActive, isTyphoonClass } from '@/domain/nws';
import { formatChstStamp } from '@/domain/time';
import { useAppState } from '@/store/appStore';
import { usePhase } from '@/store/derived';
import { AlertEssentials, PlainSummary } from '@/ui/alert-widgets';
import { Callout, Group, KeyValue, SectionFooter, SectionHeader, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, tabular, type } from '@/ui/theme';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<'/alert/[id]'>();
  const alerts = useAppState((s) => s.alerts);
  const alert = alerts.find((a) => a.alertId === id) ?? null;
  const phase = usePhase();

  if (!alert) {
    return (
      <Screen title="Official alert">
        <Callout icon="history" title="Not stored on this phone any more">
          <Subhead>Notices are kept for 90 days or the last 50.</Subhead>
        </Callout>
      </Screen>
    );
  }

  // An ended watch may have become a warning: point to whatever is in effect now instead.
  const newerActive = alerts.some((a) => a.alertId !== alert.alertId && isActive(a, phase.now) && (isTyphoonClass(a.event) || /extreme wind/i.test(a.event) || a.event === alert.event));
  const essentials = alertEssentials(alert, phase.now, phase, newerActive);

  return (
    <Screen
      title="Official alert"
      largeTitle={alert.event}
      subtitle={`${alert.severity} · ${alert.senderName} · ${formatChstStamp(alert.sent)}`}
      note={alert.isDemo ? 'Demo data · real NWS text, times shifted to now' : undefined}>
      <SectionHeader>What you need to know</SectionHeader>
      <Group padded>
        <AlertEssentials e={essentials} />
      </Group>
      <SectionFooter>{essentials.steps.length ? 'Times and places are from the official alert. The steps are standard safety advice for this kind of alert.' : 'Times and places are from the official alert.'}</SectionFooter>

      <SectionHeader>In plain words</SectionHeader>
      <Group padded>
        <PlainSummary summary={alert.plainSummary ?? alert.headline} status={alert.plainSummary ? 'ok' : alert.summaryStatus} generatedAt={alert.summaryAt} isDemo={alert.isDemo} />
      </Group>

      <SectionHeader>Official text · unedited</SectionHeader>
      <Group padded>
        <ScrollView style={styles.raw} nestedScrollEnabled>
          <Text style={[styles.rawText, tabular]} selectable accessibilityLabel="Official alert text">
            {alert.description}
            {alert.instruction ? `\n\n${alert.instruction}` : ''}
          </Text>
        </ScrollView>
      </Group>
      <SectionFooter>The summary above does not replace this text. If the two disagree, follow the official text.</SectionFooter>

      <SectionHeader>Where this came from</SectionHeader>
      <Group>
        <View style={{ paddingLeft: 16 }}>
          <KeyValue k="Source" v={`${alert.senderName} (NWS Guam, WFO GUM)`} />
          <KeyValue k="Areas" v={alert.areaDesc.replace(/, MP/g, '')} />
          <KeyValue k="Severity" v={`${alert.severity} · ${alert.urgency} · ${alert.certainty}`} />
          <KeyValue k="Issued" v={formatChstStamp(alert.sent)} />
          {alert.onset ? <KeyValue k="Onset" v={formatChstStamp(alert.onset)} /> : null}
          {alert.ends ?? alert.expires ? <KeyValue k={alert.ends ? 'Ends' : 'Next update due'} v={formatChstStamp(alert.ends ?? alert.expires)} /> : null}
          <KeyValue k="Received on this phone" v={formatChstStamp(alert.receivedAt)} />
          {alert.vtec ? <KeyValue k="VTEC" v={alert.vtec} /> : null}
          <KeyValue k="Summary" v={alert.plainSummary ? 'One server-side AI call, checked against the text' : 'auto-summary unavailable'} />
          <KeyValue k="Alert ID" v={alert.alertId} last />
        </View>
      </Group>
      <SectionFooter>{alert.sourceUrl}</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  raw: { maxHeight: 380 },
  rawText: { ...type.subheadline, color: colors.ink, lineHeight: 21 },
});
