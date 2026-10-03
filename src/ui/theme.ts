/**
 * Design tokens — native iOS idiom (grouped inset lists, SF Pro, one accent), light only.
 *
 * Three semantic colours (spec): Navy = information / tint, Red = warning, Green = done.
 * Amber is reserved for stale-data warnings. Surfaces follow iOS system grouped backgrounds so the
 * app reads like a first-party utility, not a themed web page.
 */
import { Platform, type TextStyle } from 'react-native';

export const palette = {
  navy: '#0B2545',
  navyTint: '#1D5296', // interactive tint (links, buttons, icons)
  navyFill: '#E7EEF8', // tinted fill for secondary buttons / selection
  red: '#C1121F',
  redFill: '#FBE9EB',
  green: '#12704A',
  greenFill: '#E4F3EB',
  amber: '#8A5A00',
  amberFill: '#FFF3DB',
  label: '#0B0F19',
  secondaryLabel: 'rgba(60,60,67,0.75)', // iOS uses 0.60, which is 3.4:1; 0.75 clears WCAG AA 4.5:1 on both surfaces
  tertiaryLabel: 'rgba(60,60,67,0.30)',
  separator: 'rgba(60,60,67,0.16)',
  groupedBackground: '#F2F2F7',
  secondaryGroupedBackground: '#FFFFFF',
  fill: 'rgba(120,120,128,0.12)',
  white: '#FFFFFF',
  slate: '#1C1C1E',
} as const;

/** Semantic aliases used by screens. */
export const colors = {
  navy: palette.navy,
  tint: palette.navyTint,
  navySoft: palette.navyFill,
  red: palette.red,
  redSoft: palette.redFill,
  green: palette.green,
  greenSoft: palette.greenFill,
  amber: palette.amber,
  amberSoft: palette.amberFill,
  ink: palette.label,
  ink2: palette.secondaryLabel,
  ink3: palette.secondaryLabel,
  ink4: palette.tertiaryLabel,
  line: palette.separator,
  bg: palette.groupedBackground,
  surface: palette.secondaryGroupedBackground,
  fill: palette.fill,
  offlineBar: '#E5E5EA',
  offlineText: 'rgba(60,60,67,0.85)', // 5.9:1 on the offline strip
  white: palette.white,
  onDark: 'rgba(255,255,255,0.72)',
} as const;

export const fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  /** Big numerals (countdown): SF Rounded on iOS, system elsewhere. Always tabular. */
  rounded: Platform.select({ ios: 'ui-rounded', android: 'sans-serif', default: 'System' }),
} as const;

/** Tabular figures so digits never jitter. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const radius = { group: 12, button: 12, tag: 6, control: 8 } as const;

/** Horizontal page margin (iOS inset grouped). */
export const GUTTER = 16;
/** Minimum touch target (pt). */
export const MIN_TAP = 44;
/** Cell horizontal padding inside a group. */
export const CELL_PAD = 16;

/** iOS text styles (sizes at default Dynamic Type). Body ≥ 15 per spec. */
export const type = {
  largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.4, color: colors.ink },
  title1: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.2, color: colors.ink },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.2, color: colors.ink },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41, color: colors.ink },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.41, color: colors.ink },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, letterSpacing: -0.32, color: colors.ink },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: -0.24, color: colors.ink2 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08, color: colors.ink2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, color: colors.ink2 },
  sectionHeader: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08, textTransform: 'uppercase' as const, color: colors.ink2 },
} as const;
