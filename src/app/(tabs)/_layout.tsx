import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { usePhase } from '@/store/derived';
import { colors } from '@/ui/theme';

function AlertIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3 2.5 20h19L12 3Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 9v5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={1.3} fill={color} />
    </Svg>
  );
}

function ChecklistIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6.5h3M4 12h3M4 17.5h3" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M10 6.5h10M10 12h10M10 17.5h10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ShelterIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11 12 4l9 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.5 10.5V20h13v-9.5" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M10 20v-5h4v5" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

function withBadge(icon: React.ReactNode, show: boolean) {
  return (
    <View>
      {icon}
      {show ? <View style={styles.dot} /> : null}
    </View>
  );
}

export default function TabLayout() {
  const { phase } = usePhase();
  const active = phase === 'before' || phase === 'during';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        lazy: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alert',
          tabBarAccessibilityLabel: active ? 'Alert tab, active typhoon alert' : 'Alert tab',
          tabBarIcon: ({ color }) => withBadge(<AlertIcon color={String(color)} />, active),
        }}
      />
      <Tabs.Screen name="checklist" options={{ title: 'Checklist', tabBarIcon: ({ color }) => <ChecklistIcon color={String(color)} /> }} />
      <Tabs.Screen name="shelter" options={{ title: 'Shelter', tabBarIcon: ({ color }) => <ShelterIcon color={String(color)} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, height: 64, paddingTop: 6 },
  label: { fontSize: 11, fontWeight: '700' },
  item: { minHeight: 44 },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
});
