/**
 * Design tokens. Three colours only (spec): Navy = information, Red = warning / action needed,
 * Green = done. Amber is reserved for stale-data warnings. Everything else is ink/line/surface.
 */
import { Platform } from 'react-native';

export const colors = {
  navy: '#0B2545',
  navy2: '#123A6B',
  navy3: '#1D5296',
  navySoft: '#E8F0FA',
  navyMuted: '#9EC0EA',
  red: '#C1121F',
  redSoft: '#FDECEE',
  redTint: '#FFF7F8',
  green: '#12704A',
  greenSoft: '#E7F4EE',
  amber: '#8A5A00',
  amberSoft: '#FFF6E5',
  ink: '#0E1726',
  ink2: '#3C4B61',
  ink3: '#6B7A90',
  line: '#DCE3ED',
  line2: '#EDF1F7',
  bg: '#F2F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFD',
  offlineBar: '#2A3342',
  offlineText: '#FFD9DC',
  white: '#FFFFFF',
} as const;

export const fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'ui-monospace, Menlo, monospace', default: 'monospace' }),
} as const;

export const radius = { card: 13, button: 11, pill: 999, input: 9 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Minimum touch target (pt). Wet hands, dark rooms, shaking. */
export const MIN_TAP = 44;

/** Minimum body size (pt). */
export const MIN_BODY = 14;

export const text = {
  h1: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.2, color: colors.ink },
  h2: { fontSize: 18, fontWeight: '800' as const, color: colors.ink },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: colors.ink3, fontWeight: '800' as const },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyStrong: { fontSize: 15, lineHeight: 21, color: colors.ink, fontWeight: '700' as const },
  small: { fontSize: 13, lineHeight: 18, color: colors.ink2 },
  xs: { fontSize: 12, lineHeight: 17, color: colors.ink3 },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: colors.navy, fontWeight: '700' as const },
} as const;

export const shadow = Platform.select({
  ios: { shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 1 },
  default: {},
});
