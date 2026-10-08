/**
 * Where you are, in one row: GPS state, accuracy and age, or why there is no position and what to do.
 */
import { Platform } from 'react-native';

import { describePosition } from '@/domain/places';
import { demoPositionLabel } from '@/domain/demoPositions';
import { relativeAgo } from '@/domain/time';
import { acquireLocation, openAppSettings, openLocationSettings } from '@/services/location';
import { useAppState } from '@/store/appStore';
import { useClock } from '@/store/derived';

import { Cell } from './primitives';
import { colors } from './theme';

export function LocationCell({ last }: { last?: boolean }) {
  const fix = useAppState((s) => s.location);
  const status = useAppState((s) => s.locationStatus);
  const now = useClock(15_000);

  if (fix?.demo) {
    return <Cell icon="location" title={`Demo position · ${demoPositionLabel(fix.demo)}`} subtitle="Stands in for GPS so directions can be shown off-island. Turn it off in Settings → Demo GPS position." last={last} />;
  }
  if (status === 'denied') {
    return <Cell icon="locationOff" iconColor={colors.red} title="Location permission is off" subtitle="Allow location to sort places by road distance and get directions. GPS does not need a signal." value="Settings" valueColor={colors.tint} onPress={openAppSettings} last={last} />;
  }
  if (status === 'off') {
    const where = Platform.OS === 'android' ? 'Settings → Location' : 'Settings → Privacy & Security → Location Services';
    return <Cell icon="locationOff" iconColor={colors.red} title="Location Services are off" subtitle={`Turn them on in ${where}. GPS does not need a signal.`} value="Settings" valueColor={colors.tint} onPress={openLocationSettings} last={last} />;
  }
  if (!fix) {
    const finding = status === 'requesting' || status === 'idle';
    return (
      <Cell
        icon="location"
        iconColor={colors.ink2}
        title={finding ? 'Finding your position…' : 'No GPS fix yet'}
        subtitle={finding ? 'GPS works without a signal. It is faster outdoors or by a window.' : 'GPS needs a view of the sky. Step outside or near a window and try again.'}
        value={finding ? undefined : 'Try again'}
        valueColor={colors.tint}
        onPress={finding ? undefined : () => void acquireLocation()}
        last={last}
      />
    );
  }

  const place = describePosition(fix);
  const quality = [fix.accuracyM != null ? `GPS ±${Math.round(fix.accuracyM)} m` : 'GPS', `updated ${relativeAgo(fix.at, now)}`].join(' · ');
  return (
    <Cell
      icon="location"
      title={place ? (place.village ? `Near ${place.label}` : `On ${place.label}`) : 'Not on Saipan, Tinian or Rota'}
      subtitle={place ? quality : `Directions work on the islands only. ${quality}`}
      value={status === 'requesting' ? 'Updating…' : undefined}
      last={last}
    />
  );
}
