import { Tabs } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { usePhase } from '@/store/derived';
import { Icon, type IconName } from '@/ui/icons';
import { colors } from '@/ui/theme';

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} size={24} color={color} weight="medium" />;
}

export default function TabLayout() {
  const { phase } = usePhase();
  const active = phase === 'before' || phase === 'during';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.ink2,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        lazy: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alert',
          tabBarAccessibilityLabel: active ? 'Alert tab, active typhoon alert' : 'Alert tab',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabIcon name={focused ? 'alert' : 'alertOutline'} color={active ? colors.red : String(color)} />
              {active ? <View style={styles.dot} /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="checklist" options={{ title: 'Checklist', tabBarIcon: ({ color }) => <TabIcon name="checklist" color={String(color)} /> }} />
      <Tabs.Screen name="shelter" options={{ title: 'Shelter', tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'shelter' : 'shelterOutline'} color={String(color)} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: 'rgba(249,249,249,0.94)', borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, height: Platform.OS === 'ios' ? 84 : 64, paddingTop: 6 },
  label: { fontSize: 10.5, fontWeight: '500', marginTop: 1 },
  dot: { position: 'absolute', top: -1, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, borderWidth: 1.5, borderColor: '#F9F9F9' },
});
