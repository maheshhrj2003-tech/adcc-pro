import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

const MIN = -8;
const MAX = 24;
const STEP = 4;
// Large on purpose — this adjusts caption size for low-vision users, so the
// control itself needs to be easy to see and hit, not a thin inline bar.
const TRACK_WIDTH = 280;
const THUMB_SIZE = 44;
const USABLE_WIDTH = TRACK_WIDTH - THUMB_SIZE;

interface Props {
  value: number;
  onChange: (value: number) => void;
}

function Track({ value, onChange }: Props) {
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

// Small trigger button in the control row — tapping it opens a large,
// easy-to-hit slider as a centered overlay, dismissed by tapping outside it.
// Replaces a previous version that was just a small 120x22 inline drag bar,
// too small a target for low-vision users to reliably use.
export default function CaptionSizeDrag({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Adjust caption size"
      >
        <Text style={styles.triggerText}>Aa</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.panel} onPress={() => {}}>
            <Text style={styles.panelTitle}>Caption Size</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => onChange(Math.max(MIN, value - STEP))}
                accessibilityRole="button"
                accessibilityLabel="Decrease caption size"
              >
                <Ionicons name="remove" size={26} color={colors.gold} />
              </TouchableOpacity>
              <Track value={value} onChange={onChange} />
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => onChange(Math.min(MAX, value + STEP))}
                accessibilityRole="button"
                accessibilityLabel="Increase caption size"
              >
                <Ionicons name="add" size={26} color={colors.gold} />
              </TouchableOpacity>
            </View>
            <Text style={styles.panelHint}>Tap outside to close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: { color: colors.gold, fontWeight: '800', fontSize: 15 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  panelTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHint: { color: colors.textFaint, fontSize: 12 },
  track: {
    width: TRACK_WIDTH,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    height: 6,
    marginTop: -3,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.bg,
  },
});
