/**
 * S-03 Past notices · everything received, newest first, 100% offline. Push notifications disappear; these do not.
 */
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { ALERT_RETENTION_DAYS, ALERT_RETENTION_MAX } from '@/domain/nws';
import { formatChstStamp } from '@/domain/time';
import { useAppState } from '@/store/appStore';
import { Callout, Cell, Group, SectionFooter, SectionHeader, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, tabular, type } from '@/ui/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const alerts = useAppState((s) => s.alerts);
  return (
    <Screen title="Past notices" largeTitle="Past notices" subtitle={`${alerts.length} saved on this phone · readable offline`}>
      {alerts.length === 0 ? (
        <Callout icon="history" title="No notices received yet">
          <Subhead>When the phone is online the app checks NWS for CNMI alerts and keeps every one here.</Subhead>
        </Callout>
      ) : (
        <>
          <SectionHeader>Newest first</SectionHeader>
          <Group>
            {alerts.map((a, i) => (
              <Cell
                key={a.alertId}
                icon={a.severity === 'Extreme' || a.severity === 'Severe' ? 'alert' : 'alertOutline'}
                iconColor={a.severity === 'Extreme' ? colors.red : a.severity === 'Severe' ? colors.amber : colors.ink2}
                title={`${a.event}${a.isDemo ? ' · demo' : ''}`}
                subtitle={
                  <View>
                    <Subhead style={{ marginTop: 2 }}>{a.plainSummary ?? a.headline ?? a.areaDesc}</Subhead>
                    <Text style={[type.footnote, tabular, { marginTop: 4 }]}>
                      {formatChstStamp(a.sent)} · received {formatChstStamp(a.receivedAt)}
                    </Text>
                  </View>
                }
                accessory="chevron"
                onPress={() => router.push({ pathname: '/alert/[id]', params: { id: a.alertId } })}
                last={i === alerts.length - 1}
              />
            ))}
          </Group>
        </>
      )}
      <SectionFooter>Push notifications disappear. These do not. Kept on this phone: the last {ALERT_RETENTION_MAX} notices or {ALERT_RETENTION_DAYS} days.</SectionFooter>
    </Screen>
  );
}
