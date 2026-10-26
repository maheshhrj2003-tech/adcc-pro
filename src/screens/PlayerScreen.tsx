import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { usePreferences, CAPTION_SIZE_PT, CAPTION_COLOR_HEX } from '../preferences/PreferencesContext';
import { useNowPlaying } from '../playback/NowPlayingContext';
import CaptionSizeDrag from '../components/CaptionSizeDrag';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

// This screen only plays — preparing the download happens on MovieDetail,
// and the mic sync step happens on its own Sync screen before this one is
// ever reached. Player just renders whatever NowPlayingContext already has
// attached and lets you watch/adjust; going back ends the session.
export default function PlayerScreen({ route, navigation }: Props) {
  const { slug, language } = route.params;
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const now = useNowPlaying();

  const nowRef = useRef(now);
  nowRef.current = now;

  const sessionActive = now.matches(slug, language);
  const record = sessionActive ? now.record : null;
  const cues = sessionActive ? now.cues : [];
  const sound = sessionActive ? now.sound : null;
  const positionSec = sessionActive ? now.positionSec : 0;
  const durationSec = sessionActive ? now.durationSec : 0;
  const playing = sessionActive ? now.playing : false;
  const adOn = sessionActive ? now.adOn : true;

  const manualClock = useRef<ReturnType<typeof setInterval> | null>(null);
  const [theaterLocked, setTheaterLocked] = useState(false);
  const [captionBoost, setCaptionBoost] = useState(0);

  // No live session matches this slug+language — this screen has nothing to
  // play. Can happen from a stale deep link; send back through Sync, which
  // knows how to get a session attached (or will bounce further back if the
  // title isn't even downloaded).
  useEffect(() => {
    if (!now.matches(slug, language)) {
      navigation.replace('Sync', { slug, language });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // Leaving this screen (back button, swipe-back) ends the session outright
  // — no background mini-player continuation. Empty deps so this only fires
  // on a true unmount, not on every context update mid-session.
  useEffect(() => {
    return () => {
      if (nowRef.current.matches(slug, language)) {
        nowRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const hasAudio = !!record?.adPath;

  useEffect(() => {
    if (!sessionActive || hasAudio) return;
    if (playing) {
      manualClock.current = setInterval(() => {
        now.setPositionSec((p) => {
          const next = p + 0.5;
          return durationSec > 0 && next >= durationSec ? 0 : next;
        });
      }, 500);
    } else if (manualClock.current) {
      clearInterval(manualClock.current);
    }
    return () => {
      if (manualClock.current) clearInterval(manualClock.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, hasAudio, durationSec, sessionActive]);

  useEffect(() => {
    sound?.setIsMutedAsync(!adOn);
  }, [adOn, sound]);

  const toggleAd = () => {
    if (!hasAudio) return;
    now.setAdOn((v) => !v);
  };

  const togglePlay = async () => {
    if (sound) {
      if (playing) await sound.pauseAsync();
      else await sound.playAsync();
    } else {
      now.setPlaying((p) => !p);
    }
  };

  const nudgeSync = async (deltaMs: number) => {
    const targetSec = Math.max(0, Math.min(durationSec || Infinity, positionSec + deltaMs / 1000));
    if (sound) {
      await sound.setPositionAsync(targetSec * 1000);
    } else {
      now.setPositionSec(targetSec);
    }
  };

  const currentCue = useMemo(
    () => cues.find((c) => positionSec >= c.start && positionSec < c.end),
    [cues, positionSec]
  );

  if (!record) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const captionSize = CAPTION_SIZE_PT[prefs.captionSize] + captionBoost;

  return (
    <View style={styles.theaterScreen}>
      {!theaterLocked && (
        <View style={[styles.theaterTopBar, { top: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.theaterCloseBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="chevron-down" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleAd}
            disabled={!hasAudio}
            accessibilityRole="switch"
            accessibilityState={{ checked: hasAudio && adOn, disabled: !hasAudio }}
            accessibilityLabel={hasAudio ? 'Audio description toggle' : 'Audio description not downloaded'}
          >
            {hasAudio && adOn ? (
              <View style={styles.adBadgeOn}>
                <Ionicons name="ear" size={13} color={colors.bg} />
                <Text style={styles.adBadgeOnText}>AD ON</Text>
              </View>
            ) : (
              <View style={styles.adBadgeOff}>
                <Ionicons name="ear" size={13} color={colors.textFaint} />
                <Text style={styles.adBadgeOffText}>{hasAudio ? 'AD OFF' : 'NO AD'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.theaterCaptionWrap}>
        {currentCue && (
          <Text
            style={[
              styles.theaterCaptionText,
              { fontSize: captionSize, lineHeight: captionSize * 1.45, color: CAPTION_COLOR_HEX[prefs.captionColor] },
            ]}
          >
            {currentCue.text}
          </Text>
        )}
      </View>

      <View style={[styles.theaterControls, { paddingBottom: insets.bottom + spacing.md }]}>
        {theaterLocked ? (
          <TouchableOpacity
            style={styles.theaterLockBtn}
            onPress={() => setTheaterLocked(false)}
            accessibilityRole="button"
            accessibilityLabel="Unlock controls"
          >
            <Ionicons name="lock-closed" size={20} color={colors.textFaint} />
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.theaterControlsRow}>
              <CaptionSizeDrag value={captionBoost} onChange={setCaptionBoost} />
              <TouchableOpacity
                style={styles.theaterBtnSmall}
                onPress={() => navigation.navigate('Sync', { slug, language })}
                accessibilityRole="button"
                accessibilityLabel="Resync"
              >
                <Ionicons name="mic" size={16} color={colors.gold} />
              </TouchableOpacity>
            </View>
            <View style={styles.theaterControlsRow}>
              <TouchableOpacity
                style={styles.theaterBtn}
                onPress={() => nudgeSync(-500)}
                accessibilityRole="button"
                accessibilityLabel="Skip back half a second"
              >
                <Ionicons name="play-back" size={20} color={colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.theaterPlayBtn}
                onPress={togglePlay}
                accessibilityRole="button"
                accessibilityLabel={playing ? 'Pause' : 'Play'}
              >
                <Ionicons name={playing ? 'pause' : 'play'} size={26} color={colors.bg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.theaterBtn}
                onPress={() => nudgeSync(500)}
                accessibilityRole="button"
                accessibilityLabel="Skip forward half a second"
              >
                <Ionicons name="play-forward" size={20} color={colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.theaterBtn}
                onPress={() => setTheaterLocked(true)}
                accessibilityRole="button"
                accessibilityLabel="Lock controls"
              >
                <Ionicons name="lock-open" size={20} color={colors.gold} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  theaterScreen: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between' },
  theaterTopBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  theaterCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  theaterCaptionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  theaterCaptionText: { fontWeight: '600', textAlign: 'center' },
  theaterControls: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  theaterControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  theaterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theaterBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theaterPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theaterLockBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  adBadgeOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  adBadgeOnText: { ...type.caption, color: colors.bg, fontWeight: '800', fontSize: 10 },
  adBadgeOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  adBadgeOffText: { ...type.caption, color: colors.textFaint, fontWeight: '700', fontSize: 10 },
});
