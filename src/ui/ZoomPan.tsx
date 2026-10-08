/**
 * Pinch to zoom (about the fingers), drag to pan and double-tap to zoom in, for a map drawn by its owner.
 *
 * While a gesture runs, the drawing is moved on the UI thread by the finger transform (smooth). When the
 * gestures end, the change is handed to `onCommit` and the owner re-draws its vectors at the new view
 * (crisp). The new drawing is mounted in a second, hidden layer while the old one stays on screen; once it is
 * there, the UI thread shows it and takes the committed change out of the finger transform in the same
 * update — so nothing moves, blinks or blurs, even if the next gesture has already begun.
 *
 * The content is drawn `margin` points larger on every side, so panning reveals map that is already drawn.
 */
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { anchored, clamp, compose, contentAt, inverse, isIdentity, screenAt, zoomAbout, type ViewTransform } from './zoomMath';

type Layer = 0 | 1;

export function ZoomPan({
  width,
  height,
  margin = 0,
  minScale,
  maxScale,
  panEnabled = true,
  onCommit,
  onStart,
  style,
  testID = 'zoom-pan',
  children,
}: {
  width: number;
  height: number;
  margin?: number;
  /** Smallest / largest scale allowed relative to the view currently drawn. */
  minScale: number;
  maxScale: number;
  /** One-finger drag. Off for an embedded map shown whole, so the page can scroll instead. */
  panEnabled?: boolean;
  /** The gestures have ended: re-draw with this transform (about the window centre) applied, in the same React update. */
  onCommit: (t: ViewTransform) => void;
  /** Called when the user starts interacting (e.g. stop following GPS). */
  onStart?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Also names the gestures for tests: `<testID>-pinch`, `-pan` and `-double-tap`. */
  testID?: string;
  children: ReactNode;
}) {
  // The finger transform, applied to whichever layer is shown.
  const s = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseTx = useSharedValue(0);
  const baseTy = useSharedValue(0);
  const baseS = useSharedValue(1);
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const pinching = useSharedValue(false);
  const active = useSharedValue(0);
  // `live` renders the owner's current drawing; the other layer holds the drawing that was on screen at the
  // last commit until the new one is shown. `shown` is the layer on screen (UI thread).
  const [layers, setLayers] = useState<{ live: Layer; held: ReactNode }>({ live: 0, held: null });
  const shown = useSharedValue<Layer>(0);
  // The change handed to the owner and not yet shown; gestures that end meanwhile wait for it (dirty).
  const sent = useSharedValue<ViewTransform | null>(null);
  const dirty = useSharedValue(false);
  const cx = width / 2;
  const cy = height / 2;

  const commit = (t: ViewTransform) => {
    setLayers((l) => ({ live: l.live === 0 ? 1 : 0, held: children }));
    onCommit(t);
  };
  const release = (live: Layer) => setLayers((l) => (l.live === live ? { live, held: null } : l));
  const start = () => onStart?.();

  const settle = () => {
    'worklet';
    if (active.get() > 0) return;
    if (sent.get()) {
      dirty.set(true);
      return;
    }
    const t = { s: s.get(), tx: tx.get(), ty: ty.get() };
    if (isIdentity(t)) return;
    sent.set(t);
    scheduleOnRN(commit, t);
  };

  // Layer `live` now holds the drawing with `sent` applied: show it, and in the same update express the finger
  // transform (and any gesture under way) against it, so what is on screen does not move.
  const swap = (live: Layer) => {
    'worklet';
    const d = sent.get();
    if (live === shown.get() || !d) return;
    shown.set(live);
    const t = compose({ s: s.get(), tx: tx.get(), ty: ty.get() }, inverse(d));
    s.set(t.s);
    tx.set(t.tx);
    ty.set(t.ty);
    const q = screenAt(d, { x: anchorX.get(), y: anchorY.get() }, { x: cx, y: cy });
    anchorX.set(q.x);
    anchorY.set(q.y);
    baseS.set(baseS.get() / d.s);
    baseTx.set(baseTx.get() - t.s * d.tx);
    baseTy.set(baseTy.get() - t.s * d.ty);
    sent.set(null);
    scheduleOnRN(release, live);
    if (dirty.get()) {
      dirty.set(false);
      settle();
    }
  };
  // After every render (so the UI thread holds this render's callbacks): acts once the new layer is mounted.
  useLayoutEffect(() => {
    scheduleOnUI(swap, layers.live);
  });

  const begin = () => {
    'worklet';
    // A touch stops a double-tap zoom where it is.
    cancelAnimation(s);
    cancelAnimation(tx);
    cancelAnimation(ty);
    active.set(active.get() + 1);
    scheduleOnRN(start);
  };
  const end = () => {
    'worklet';
    active.set(Math.max(0, active.get() - 1));
    settle();
  };

  const pan = Gesture.Pan()
    .withTestId(`${testID}-pan`)
    .enabled(panEnabled)
    .maxPointers(1)
    .minDistance(6)
    .onStart(() => {
      begin();
      baseTx.set(tx.get());
      baseTy.set(ty.get());
      panX.set(0);
      panY.set(0);
    })
    .onUpdate((e) => {
      panX.set(e.translationX);
      panY.set(e.translationY);
      if (pinching.get()) return;
      tx.set(baseTx.get() + e.translationX);
      ty.set(baseTy.get() + e.translationY);
    })
    .onEnd(() => end());

  const pinch = Gesture.Pinch()
    .withTestId(`${testID}-pinch`)
    .onStart((e) => {
      begin();
      pinching.set(true);
      baseS.set(s.get());
      const q = contentAt({ s: s.get(), tx: tx.get(), ty: ty.get() }, { x: e.focalX, y: e.focalY }, { x: cx, y: cy });
      anchorX.set(q.x);
      anchorY.set(q.y);
    })
    .onUpdate((e) => {
      // Keep the map point that was under the fingers under the fingers (two-finger pan included).
      const t = anchored({ x: anchorX.get(), y: anchorY.get() }, { x: e.focalX, y: e.focalY }, clamp(baseS.get() * e.scale, minScale, maxScale), { x: cx, y: cy });
      s.set(t.s);
      tx.set(t.tx);
      ty.set(t.ty);
    })
    .onEnd(() => {
      pinching.set(false);
      // A one-finger drag that continues after the pinch carries on from here without a jump.
      baseTx.set(tx.get() - panX.get());
      baseTy.set(ty.get() - panY.get());
      end();
    });

  const doubleTap = Gesture.Tap()
    .withTestId(`${testID}-double-tap`)
    .numberOfTaps(2)
    .maxDistance(24)
    .onEnd((e, success) => {
      if (!success || active.get() > 0 || sent.get()) return;
      const current: ViewTransform = { s: s.get(), tx: tx.get(), ty: ty.get() };
      const factor = clamp(current.s * 2, minScale, maxScale) / current.s;
      if (factor <= 1.001) return;
      scheduleOnRN(start);
      const t = zoomAbout(current, { x: e.x, y: e.y }, factor, { x: cx, y: cy });
      tx.set(withTiming(t.tx, { duration: 220 }));
      ty.set(withTiming(t.ty, { duration: 220 }));
      s.set(
        withTiming(t.s, { duration: 220 }, (finished) => {
          if (!finished) return;
          tx.set(t.tx);
          ty.set(t.ty);
          settle();
        }),
      );
    });

  const layer0 = useAnimatedStyle(() => ({ opacity: shown.get() === 0 ? 1 : 0, transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: s.get() }] }));
  const layer1 = useAnimatedStyle(() => ({ opacity: shown.get() === 1 ? 1 : 0, transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: s.get() }] }));
  const box = { left: -margin, top: -margin, width: width + 2 * margin, height: height + 2 * margin };

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={[{ width, height, overflow: 'hidden' }, style]} collapsable={false} testID={testID}>
        <Animated.View style={[styles.layer, box, layer0]} pointerEvents={layers.live === 0 ? 'box-none' : 'none'}>
          {layers.live === 0 ? children : layers.held}
        </Animated.View>
        <Animated.View style={[styles.layer, box, layer1]} pointerEvents={layers.live === 1 ? 'box-none' : 'none'}>
          {layers.live === 1 ? children : layers.held}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
});
