import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { colors } from '../theme';

const MIN = -8;
const MAX = 24;
const STEP = 4;
const TRACK_WIDTH = 120;
const THUMB_SIZE = 22;
const USABLE_WIDTH = TRACK_WIDTH - THUMB_SIZE;

interface Props {
  value: number;
  onChange: (value: number) => void;
}

// A small drag-to-adjust control, replacing separate +/- tap buttons for
// caption size. Built on PanResponder (core React Native, no extra native
// dependency) rather than a slider library, so this stays a pure-JS change.
export default function CaptionSizeDrag({ value, onChange }: Props) {
  // Refs mirror the latest props on every render — the PanResponder's
  // handlers are created once (via the useRef below) and would otherwise
  // close over stale values from whichever render first created them.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const startValueRef = useRef(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const range = MAX - MIN;
        const deltaValue = (gestureState.dx / USABLE_WIDTH) * range;
        const raw = Math.max(MIN, Math.min(MAX, startValueRef.current + deltaValue));
        const snapped = Math.round(raw / STEP) * STEP;
        if (snapped !== valueRef.current) onChangeRef.current(snapped);
      },
    })
  ).current;

  const ratio = (value - MIN) / (MAX - MIN);
  const thumbLeft = ratio * USABLE_WIDTH;

  return (
    <View
      style={styles.track}
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Caption size"
      accessibilityValue={{ min: MIN, max: MAX, now: value }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase caption size' },
        { name: 'decrement', label: 'Decrease caption size' },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(MAX, value + STEP));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(MIN, value - STEP));
      }}
    >
      <View style={[styles.fill, { width: thumbLeft + THUMB_SIZE / 2 }]} />
      <View style={[styles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    height: 3,
    marginTop: -1.5,
    borderRadius: 1.5,
    backgroundColor: colors.gold,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
