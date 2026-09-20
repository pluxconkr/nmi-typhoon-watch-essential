/**
 * Icons: SF Symbols on iOS (expo-symbols), Ionicons elsewhere. Always inline, never on a
 * background shape — the glyph and its tint carry the meaning.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ICONS = {
  alert: { sf: 'exclamationmark.triangle.fill', ion: 'warning' },
  alertOutline: { sf: 'exclamationmark.triangle', ion: 'warning-outline' },
  checklist: { sf: 'checklist', ion: 'list' },
  shelter: { sf: 'house.fill', ion: 'home' },
  shelterOutline: { sf: 'house', ion: 'home-outline' },
  chevron: { sf: 'chevron.right', ion: 'chevron-forward' },
  back: { sf: 'chevron.left', ion: 'chevron-back' },
  check: { sf: 'checkmark', ion: 'checkmark' },
  checkCircle: { sf: 'checkmark.circle.fill', ion: 'checkmark-circle' },
  circle: { sf: 'circle', ion: 'ellipse-outline' },
  close: { sf: 'xmark', ion: 'close' },
  info: { sf: 'info.circle', ion: 'information-circle-outline' },
  offline: { sf: 'wifi.slash', ion: 'cloud-offline-outline' },
  download: { sf: 'arrow.down.circle', ion: 'cloud-download-outline' },
  refresh: { sf: 'arrow.clockwise', ion: 'refresh' },
  phone: { sf: 'phone.fill', ion: 'call' },
  location: { sf: 'location.fill', ion: 'navigate' },
  locationOff: { sf: 'location.slash', ion: 'navigate-outline' },
  map: { sf: 'map', ion: 'map-outline' },
  clock: { sf: 'clock', ion: 'time-outline' },
  wind: { sf: 'wind', ion: 'flag-outline' },
  water: { sf: 'drop.fill', ion: 'water-outline' },
  food: { sf: 'fork.knife', ion: 'restaurant-outline' },
  pill: { sf: 'pills.fill', ion: 'medkit-outline' },
  battery: { sf: 'battery.100', ion: 'battery-charging-outline' },
  fuel: { sf: 'fuelpump.fill', ion: 'flame-outline' },
  baby: { sf: 'figure.child', ion: 'happy-outline' },
  pet: { sf: 'pawprint.fill', ion: 'paw-outline' },
  cash: { sf: 'banknote.fill', ion: 'cash-outline' },
  docs: { sf: 'doc.text.fill', ion: 'document-text-outline' },
  people: { sf: 'person.2.fill', ion: 'people-outline' },
  elder: { sf: 'figure.roll', ion: 'accessibility-outline' },
  generator: { sf: 'bolt.fill', ion: 'flash-outline' },
  history: { sf: 'clock.arrow.circlepath', ion: 'time-outline' },
  faq: { sf: 'questionmark.circle', ion: 'help-circle-outline' },
  document: { sf: 'doc.text', ion: 'document-text-outline' },
  settings: { sf: 'slider.horizontal.3', ion: 'options-outline' },
  bell: { sf: 'bell.fill', ion: 'notifications-outline' },
  storm: { sf: 'hurricane', ion: 'thunderstorm-outline' },
  eye: { sf: 'eye.slash.fill', ion: 'eye-off-outline' },
  power: { sf: 'bolt.slash.fill', ion: 'flash-off-outline' },
  flood: { sf: 'water.waves', ion: 'water-outline' },
  family: { sf: 'person.3.fill', ion: 'people-circle-outline' },
  roof: { sf: 'house.fill', ion: 'home-outline' },
  danger: { sf: 'exclamationmark.octagon.fill', ion: 'alert-circle' },
  shield: { sf: 'checkmark.shield.fill', ion: 'shield-checkmark-outline' },
  sun: { sf: 'sun.max.fill', ion: 'sunny-outline' },
  trash: { sf: 'trash', ion: 'trash-outline' },
  flask: { sf: 'function', ion: 'flask-outline' },
  star: { sf: 'star.fill', ion: 'star' },
} as const satisfies Record<string, { sf: string; ion: IonName }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = '#0B0F19', weight = 'medium', style }: { name: IconName; size?: number; color?: string; weight?: SymbolWeight; style?: StyleProp<ViewStyle> }) {
  const def = ICONS[name];
  const fallback = <Ionicons name={def.ion} size={size} color={color} />;
  if (Platform.OS !== 'ios') return fallback;
  return <SymbolView name={def.sf as never} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={[{ width: size, height: size }, style]} fallback={fallback} />;
}

/** Icon for a checklist item id. */
export function checklistIcon(itemId: string): IconName {
  switch (itemId) {
    case 'water':
    case 'petwater':
      return 'water';
    case 'food':
      return 'food';
    case 'meds':
      return 'pill';
    case 'batt':
      return 'battery';
    case 'fuel':
      return 'fuel';
    case 'formula':
      return 'baby';
    case 'petfood':
      return 'pet';
    case 'cash':
      return 'cash';
    case 'docs':
      return 'docs';
    default:
      return 'check';
  }
}

/** Icon for a FAQ entry id. */
export function faqIcon(id: string): IconName {
  switch (id) {
    case 'power-out':
      return 'power';
    case 'no-water':
      return 'water';
    case 'wind-stopped':
      return 'eye';
    case 'roof-window':
      return 'roof';
    case 'family-contact':
      return 'family';
    case 'water-inside':
      return 'flood';
    case 'downed-lines':
      return 'danger';
    case 'fema-apply':
      return 'document';
    default:
      return 'faq';
  }
}
