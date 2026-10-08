import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Importing this module also defines the background poll task at module scope (required by expo-task-manager).
import { ensureBackgroundPollRegistered } from '@/services/backgroundPoll';
import { applyDemoScenario } from '@/services/demo';
import { startNetworkWatch } from '@/services/network';
import { configureNotifications } from '@/services/notifications';
import { refreshIfDue } from '@/services/refresh';
import { getState, hydrate, useAppState } from '@/store/appStore';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Synchronous hydration from local storage before the first render. No network, no waiting.
hydrate();

export const unstable_settings = {
  anchor: '(tabs)',
};

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, primary: colors.navy, text: colors.ink, border: colors.line },
};

export default function RootLayout() {
  const onboarded = useAppState((s) => s.onboarded);
  const booted = useRef(false);

  useEffect(() => {
    SplashScreen.hide();
    if (booted.current) return;
    booted.current = true;
    // Re-materialise the demo scenario (timestamps are relative to now) before any refresh runs.
    const scenario = getState().settings.demoScenario;
    if (scenario !== 'live') applyDemoScenario(scenario);
    const stopNet = startNetworkWatch((info) => {
      if (info.online) void refreshIfDue();
    });
    void configureNotifications();
    void ensureBackgroundPollRegistered();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void refreshIfDue();
    });
    // While the app is open, check on the Settings schedule (automatic: hourly, every 10 min during a storm alert).
    const tick = setInterval(() => void refreshIfDue(), 30_000);
    return () => {
      stopNet();
      sub.remove();
      clearInterval(tick);
    };
  }, []);

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="alert/[id]" />
          <Stack.Screen name="history" />
          <Stack.Screen name="household" />
          <Stack.Screen name="shelter/[id]" />
          <Stack.Screen name="downloads" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="supplies" />
          <Stack.Screen name="store/[id]" />
          <Stack.Screen name="navigate" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="faq" />
          <Stack.Screen name="why/[itemId]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
