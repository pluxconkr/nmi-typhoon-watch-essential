/**
 * Small building blocks shared by every screen. Three colours, 44pt targets, ≥14pt text,
 * numbers in monospace. No spinners anywhere.
 */
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

import { MIN_TAP, colors, fonts, radius, space, text } from './theme';

export function Card({ children, style, tone = 'default' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'red' | 'green' | 'amber' | 'navy' | 'muted' | 'dashed' }) {
  return <View style={[styles.card, toneStyle[tone], style]}>{children}</View>;
}

const toneStyle: Record<string, ViewStyle> = {
  default: {},
  red: { borderColor: colors.red, backgroundColor: colors.redTint },
  green: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  amber: { borderColor: colors.amber, backgroundColor: colors.amberSoft },
  navy: { borderColor: colors.navy, backgroundColor: colors.navy },
  muted: { backgroundColor: colors.surfaceMuted },
  dashed: { borderStyle: 'dashed' },
};

export function SectionLabel({ children, style, color }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  return <Text style={[text.sectionLabel, color ? { color } : null, styles.sectionLabel, style]}>{children}</Text>;
}

export function Body({ children, style, strong, ...rest }: TextProps & { children: ReactNode; strong?: boolean }) {
  return (
    <Text style={[strong ? text.bodyStrong : text.body, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Small({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[text.small, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Xs({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[text.xs, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Mono({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[text.mono, style]} {...rest}>
      {children}
    </Text>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[text.h1, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[text.h2, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export type PillTone = 'navy' | 'red' | 'green' | 'amber' | 'grey';

export function Pill({ children, tone = 'grey', style }: { children: ReactNode; tone?: PillTone; style?: StyleProp<ViewStyle> }) {
  const bg = { navy: colors.navySoft, red: colors.redSoft, green: colors.greenSoft, amber: colors.amberSoft, grey: colors.line2 }[tone];
  const fg = { navy: colors.navy, red: colors.red, green: colors.green, amber: colors.amber, grey: colors.ink2 }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityHint,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'red' | 'green';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}) {
  const bg = { primary: colors.navy, ghost: colors.surface, red: colors.red, green: colors.green }[variant];
  const fg = variant === 'ghost' ? colors.navy : colors.white;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'ghost' ? colors.line : bg },
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** A row that navigates somewhere (chevron on the right). */
export function LinkRow({ title, subtitle, onPress, right, tone = 'default', style }: { title: string; subtitle?: ReactNode; onPress: () => void; right?: ReactNode; tone?: 'default' | 'red' | 'green'; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, tone === 'red' && { borderColor: colors.red }, tone === 'green' && { borderColor: colors.green }, pressed && styles.pressed, styles.linkRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        {subtitle ? <View style={{ marginTop: 2 }}>{typeof subtitle === 'string' ? <Xs>{subtitle}</Xs> : subtitle}</View> : null}
      </View>
      {right ?? <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync().catch(() => {});
        onChange(!checked);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={label}
      hitSlop={10}
      style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
    </Pressable>
  );
}

export function Stepper({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; hint?: string }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Xs>{hint}</Xs> : null}
      </View>
      <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ now: value, min, max, text: String(value) }}>
        <Pressable onPress={dec} accessibilityLabel={`Decrease ${label}`} accessibilityRole="button" disabled={value <= min} style={({ pressed }) => [styles.stepBtn, value <= min && styles.buttonDisabled, pressed && styles.pressed]}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={inc} accessibilityLabel={`Increase ${label}`} accessibilityRole="button" disabled={value >= max} style={({ pressed }) => [styles.stepBtn, value >= max && styles.buttonDisabled, pressed && styles.pressed]}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Xs>{hint}</Xs> : null}
      </View>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onChange(!value);
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
        style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </Pressable>
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ pct, color = colors.green, label }: { pct: number; color?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ now: clamped, min: 0, max: 100, text: label ?? `${clamped}%` }}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.hrow, style]}>{children}</View>;
}

export const pressStyle: PressableProps['style'] = ({ pressed }) => (pressed ? styles.pressed : null);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 11,
  },
  sectionLabel: { marginBottom: 9 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3 },
  button: {
    minHeight: MIN_TAP + 4,
    borderRadius: radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: MIN_TAP + 12 },
  linkTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  chevron: { fontSize: 24, color: colors.ink3, marginLeft: 4 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.white, fontWeight: '900', fontSize: 15, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line2, minHeight: MIN_TAP + 12 },
  rowLabel: { fontSize: 15, fontWeight: '650' as unknown as '600', color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: MIN_TAP, height: MIN_TAP, borderRadius: radius.input, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: colors.navy, lineHeight: 26 },
  stepValue: { fontFamily: fonts.mono, fontSize: 18, fontWeight: '700', minWidth: 30, textAlign: 'center', color: colors.ink },
  toggle: { width: 52, height: 31, borderRadius: radius.pill, backgroundColor: colors.line, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.green },
  toggleKnob: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.white, ...(Platform.OS === 'web' ? {} : { elevation: 2 }) },
  toggleKnobOn: { alignSelf: 'flex-end' },
  segmented: { flexDirection: 'row', backgroundColor: colors.line2, borderRadius: radius.input, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: MIN_TAP - 6, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  segmentOn: { backgroundColor: colors.navy },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.ink2 },
  segmentTextOn: { color: colors.white },
  progress: { height: 10, borderRadius: radius.pill, backgroundColor: colors.line2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  divider: { height: 1, backgroundColor: colors.line2, marginVertical: space.sm },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
