/**
 * Screen scaffold: OFFLINE banner (never hidden while offline), optional back header, scroll body.
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isOfflineNow, useAppState } from '@/store/appStore';

import { MIN_TAP, colors, space } from './theme';

export function OfflineBanner() {
  const offline = useAppState((s) => isOfflineNow(s));
  const source = useAppState((s) => s.shelterSource);
  const simulated = useAppState((s) => s.settings.simulateOffline);
  if (!offline) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.offlineText}>
        OFFLINE MODE · {source === 'network' ? 'reading saved data' : 'using data bundled with the app'}
        {simulated ? ' · simulated' : ''}
      </Text>
    </View>
  );
}

type Router = ReturnType<typeof useRouter>;

/** Go back if there is history; otherwise replace with a sensible fallback (deep links, tests). */
export function goBackOr(router: Router, fallback: '/' | '/checklist' | '/shelter' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.backBar}>
      <Pressable
        onPress={() => goBackOr(router)}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <Text style={styles.backTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ marginLeft: 'auto' }}>{right}</View>
    </View>
  );
}

export function Screen({
  children,
  title,
  header,
  contentStyle,
  padded = true,
  scroll = true,
  testID,
}: {
  children: ReactNode;
  /** When set, renders a BackHeader with this title. */
  title?: string;
  /** Custom header element rendered above the body (e.g. the red alert hero). */
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  scroll?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={[padded && styles.padded, contentStyle]}>{children}</View>
  );
  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
      <OfflineBanner />
      {title ? <BackHeader title={title} /> : null}
      {scroll ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          {header}
          {body}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>
          {header}
          {body}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  padded: { paddingHorizontal: space.lg, paddingTop: space.lg },
  offline: { backgroundColor: colors.offlineBar, paddingVertical: 7, paddingHorizontal: 12, alignItems: 'center' },
  offlineText: { color: colors.offlineText, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  backBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line2, minHeight: MIN_TAP },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4, minHeight: MIN_TAP, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '800', color: colors.navy },
  backTitle: { fontSize: 15, fontWeight: '700', color: colors.ink2, flexShrink: 1 },
});
