/**
 * S-02 Alert detail · official text + provenance. The summary never replaces the official text.
 */
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatChstStamp } from '@/domain/time';
import { useAppState } from '@/store/appStore';
import { PlainSummary } from '@/ui/alert-widgets';
import { Body, Card, Pill, SectionLabel, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

function Prov({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.prov}>
      <Text style={styles.provKey}>{k}</Text>
      <Text style={styles.provVal} selectable>
        {v}
      </Text>
    </View>
  );
}

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<'/alert/[id]'>();
  const alert = useAppState((s) => s.alerts.find((a) => a.alertId === id) ?? null);

  if (!alert) {
    return (
      <Screen title="Official alert">
        <Body>This notice is no longer stored on this phone (notices are kept for 90 days or the last 50).</Body>
      </Screen>
    );
  }

  return (
    <Screen title="Official alert">
      <View style={styles.pills}>
        <Pill tone="navy">S-02</Pill>
        <Pill tone={alert.severity === 'Extreme' ? 'red' : alert.severity === 'Severe' ? 'amber' : 'grey'}>{alert.severity}</Pill>
        {alert.isDemo ? <Pill tone="amber">DEMO DATA · real NWS text, shifted times</Pill> : null}
      </View>
      <PlainSummary summary={alert.plainSummary ?? alert.headline} status={alert.plainSummary ? 'ok' : alert.summaryStatus} generatedAt={alert.summaryAt} isDemo={alert.isDemo} />

      <Card style={{ marginTop: 12 }}>
        <SectionLabel>Where this came from</SectionLabel>
        <Prov k="Source" v={`${alert.senderName} (NWS Guam, WFO GUM)`} />
        <Prov k="Alert ID" v={alert.alertId} />
        <Prov k="Event" v={alert.event} />
        <Prov k="Severity · urgency · certainty" v={`${alert.severity} · ${alert.urgency} · ${alert.certainty}`} />
        <Prov k="Areas" v={alert.areaDesc} />
        <Prov k="Issued" v={formatChstStamp(alert.sent)} />
        {alert.onset ? <Prov k="Onset" v={formatChstStamp(alert.onset)} /> : null}
        {alert.ends ?? alert.expires ? <Prov k={alert.ends ? 'Ends' : 'Next update due'} v={formatChstStamp(alert.ends ?? alert.expires)} /> : null}
        <Prov k="Received on this phone" v={formatChstStamp(alert.receivedAt)} />
        {alert.vtec ? <Prov k="VTEC" v={alert.vtec} /> : null}
        <Prov k="Summary" v={alert.plainSummary ? 'One server-side AI call, checked against the text, cached on this phone' : 'auto-summary unavailable'} />
        <Prov k="Record" v={alert.sourceUrl} />
      </Card>

      <Card>
        <SectionLabel>Official text · unedited</SectionLabel>
        <ScrollView style={styles.raw} nestedScrollEnabled>
          <Text style={styles.rawText} selectable accessibilityLabel="Official alert text">
            {alert.description}
            {alert.instruction ? `\n\n${alert.instruction}` : ''}
          </Text>
        </ScrollView>
        <Xs style={{ marginTop: 8 }}>The summary above does not replace this text. If the two disagree, follow the official text.</Xs>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  prov: { flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  provKey: { flexBasis: '40%', fontSize: 12, color: colors.ink3, fontWeight: '700' },
  provVal: { flex: 1, fontFamily: fonts.mono, fontSize: 12, color: colors.ink },
  raw: { maxHeight: 320, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10 },
  rawText: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 19, color: colors.ink },
});
