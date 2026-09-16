/**
 * S-03 Past notices · everything received, newest first, 100% offline. Push notifications disappear; these do not.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ALERT_RETENTION_DAYS, ALERT_RETENTION_MAX } from '@/domain/nws';
import { formatChstStamp } from '@/domain/time';
import { useAppState } from '@/store/appStore';
import { Body, Card, Pill, Small, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const alerts = useAppState((s) => s.alerts);
  return (
    <Screen title="Past notices">
      <View style={styles.pills}>
        <Pill tone="navy">S-03</Pill>
        <Pill tone="green">offline</Pill>
      </View>
      <Xs style={{ marginBottom: 12 }}>
        Push notifications disappear. These do not. Kept on this phone: the last {ALERT_RETENTION_MAX} notices or {ALERT_RETENTION_DAYS} days.
      </Xs>
      {alerts.length === 0 ? (
        <Card>
          <Body>No notices received yet. When the phone is online the app checks NWS for CNMI alerts and keeps every one here.</Body>
        </Card>
      ) : (
        alerts.map((a) => (
          <Pressable key={a.alertId} onPress={() => router.push({ pathname: '/alert/[id]', params: { id: a.alertId } })} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
            <View style={styles.head}>
              <Text style={styles.event}>
                {a.event}
                {a.isDemo ? ' · demo' : ''}
              </Text>
              <Pill tone={a.severity === 'Extreme' ? 'red' : a.severity === 'Severe' ? 'amber' : 'grey'}>{a.severity}</Pill>
            </View>
            <Small style={{ marginVertical: 5 }}>“{a.plainSummary ?? a.headline ?? a.areaDesc}”</Small>
            <Text style={styles.stamp}>{formatChstStamp(a.sent)} · received {formatChstStamp(a.receivedAt)}</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 11 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  event: { fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  stamp: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.ink3 },
});
