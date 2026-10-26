import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getDownloadRecord, DownloadRecord } from '../api/downloads';
import { syncTrack } from '../api/sync';
import { ApiError } from '../api/types';
import { parseSrt, SrtCue } from '../utils/srt';
import { usePreferences } from '../preferences/PreferencesContext';
import { useNowPlaying } from '../playback/NowPlayingContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Sync'>;

const RECORDING_SECONDS = 15;

// Dedicated sync screen, reached from MovieDetail's "Play Movie" — the
// reference flow syncs with a deliberate tap, not an auto-fired recording.
// On a match, this attaches the session to NowPlayingContext and hands off
// to PlayerScreen, which then just plays — it owns none of this logic.
export default function SyncScreen({ route, navigation }: Props) {
  const { slug, language } = route.params;
  const { prefs, loading: prefsLoading } = usePreferences();
  const now = useNowPlaying();

  const [record, setRecord] = useState<DownloadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [micState, setMicState] = useState<'idle' | 'requesting' | 'recording' | 'matching'>('idle');
  const [countdown, setCountdown] = useState(RECORDING_SECONDS);
  const [message, setMessage] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // If this exact title+language is already live elsewhere (minimized
  // mini-player, or re-tapping Play on something already playing), there's
  // nothing to sync — just go straight to the player.
  useEffect(() => {
    if (now.matches(slug, language)) {
      now.restore();
      navigation.replace('Player', { slug, language });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefsLoading) return;
    let cancelled = false;
    (async () => {
      const rec = await getDownloadRecord(slug, language);
      if (cancelled) return;
      if (!rec) {
        setLoadError("This title hasn't been downloaded yet.");
        setLoading(false);
        return;
      }
      setRecord(rec);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, language, prefsLoading]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // Loads the AD sound + captions and hands the session to NowPlayingContext,
  // seeking to the given position before handing off to PlayerScreen.
  const attachAndEnterPlayer = async (startAtSec: number, autoplay: boolean) => {
    if (!record) return;
    let parsedCues: SrtCue[] = [];
    if (record.ccPath) {
      try {
        const content = await FileSystem.readAsStringAsync(record.ccPath);
        parsedCues = parseSrt(content);
      } catch {
        parsedCues = [];
      }
    }

    let loadedSound: Audio.Sound | null = null;
    const initialAdOn = prefs.adEnabledByDefault;
    if (record.adPath) {
      try {
        const { sound: loaded } = await Audio.Sound.createAsync(
          { uri: record.adPath },
          { shouldPlay: false, isMuted: !initialAdOn, volume: 1.0, positionMillis: startAtSec * 1000 }
        );
        loaded.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;
          now.setPositionSec(status.positionMillis / 1000);
          if (status.durationMillis) now.setDurationSec(status.durationMillis / 1000);
          now.setPlaying(status.isPlaying);
        });
        loadedSound = loaded;
      } catch {
        // AD failed to load — captions still work off the manual clock.
      }
    }

    now.attach(record, loadedSound, parsedCues, initialAdOn);
    if (!loadedSound) {
      now.setDurationSec(record.runtimeSeconds || (parsedCues.length ? parsedCues[parsedCues.length - 1].end : 60));
      now.setPositionSec(startAtSec);
    }
    if (autoplay) {
      if (loadedSound) await loadedSound.playAsync();
      else now.setPlaying(true);
    }

    navigation.replace('Player', { slug, language });
  };

  const startSync = async () => {
    if (!record) return;
    setMessage(null);
    setMicState('requesting');
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      setMicState('idle');
      setMessage('Microphone permission is required to sync.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      const startedAt = Date.now();

      setMicState('recording');
      setCountdown(RECORDING_SECONDS);
      countdownTimer.current = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : c)), 1000);

      await new Promise((resolve) => setTimeout(resolve, RECORDING_SECONDS * 1000));
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true });

      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('Recording produced no file.');

      setMicState('matching');
      const result = await syncTrack(record.trackId, uri);
      const elapsedSec = (Date.now() - startedAt) / 1000;
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      if (result.matched) {
        const correctedSec = Math.max(0, result.offset_seconds + elapsedSec);
        setMicState('idle');
        await attachAndEnterPlayer(correctedSec, true);
      } else {
        setMicState('idle');
        setMessage("Couldn't find a confident match — hold the phone closer to the audio and try again.");
      }
    } catch (e) {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      setMicState('idle');
      if (e instanceof ApiError && e.status === 422) setMessage(e.message);
      else setMessage('Sync failed. Check your connection and try again.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true }).catch(() => {});
    }
  };

  const skip = () => attachAndEnterPlayer(0, true);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (loadError || !record) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBusy = micState !== 'idle';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>ADCC</Text>
          <Text style={styles.brandSub}>PRO</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {micState === 'recording' && (
        <View style={styles.headphoneBanner}>
          <Ionicons name="headset" size={14} color={colors.gold} />
          <Text style={styles.headphoneBannerText}>For a better sync, use headphones</Text>
        </View>
      )}

      <View style={styles.body}>
        <Image source={{ uri: record.posterUrl }} style={styles.poster} />
        <Text style={styles.title}>{record.title}</Text>
        <View style={styles.langPill}>
          <Text style={styles.langPillText}>{record.languageName.toUpperCase()}</Text>
        </View>

        <View style={styles.micArea}>
          {micState === 'requesting' ? (
            <ActivityIndicator color={colors.gold} size="large" />
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, micState === 'recording' && styles.micBtnRecording]}
              onPress={startSync}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel={micState === 'recording' ? 'Stop recording' : 'Tap to sync'}
            >
              {micState === 'recording' ? (
                <View style={styles.stopIcon} />
              ) : micState === 'matching' ? (
                <ActivityIndicator color={colors.gold} size="small" />
              ) : (
                <Ionicons name="mic" size={30} color={colors.gold} />
              )}
            </TouchableOpacity>
          )}
          <Text style={styles.micLabel}>
            {micState === 'requesting' && 'REQUESTING PERMISSION…'}
            {micState === 'recording' && `LISTENING… ${countdown}s`}
            {micState === 'matching' && 'MATCHING…'}
            {micState === 'idle' && 'TAP TO SYNC'}
          </Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>

        {!isBusy && (
          <TouchableOpacity onPress={skip} accessibilityRole="button" accessibilityLabel="Skip sync and play from the start">
            <Text style={styles.skipText}>Skip — play from the start</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  backBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  backBtnText: { ...type.body, color: colors.text, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  brand: { ...type.h1, color: colors.text, letterSpacing: 1 },
  brandSub: { ...type.caption, color: colors.gold, fontWeight: '800', letterSpacing: 1 },
  headphoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(230,51,43,0.12)',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  headphoneBannerText: { ...type.caption, color: colors.gold, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  poster: { width: 160, height: 230, borderRadius: radius.md, backgroundColor: colors.surface },
  title: { ...type.h1, color: colors.text, textAlign: 'center', marginTop: spacing.md },
  langPill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  langPillText: { ...type.caption, color: colors.textMuted, fontWeight: '700', fontSize: 11 },
  micArea: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.md },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: { backgroundColor: 'rgba(230,51,43,0.15)' },
  stopIcon: { width: 20, height: 20, borderRadius: 3, backgroundColor: colors.gold },
  micLabel: { ...type.label, color: colors.textMuted, letterSpacing: 1.5 },
  message: { ...type.caption, color: colors.textFaint, textAlign: 'center', maxWidth: 260, marginTop: spacing.xs },
  skipText: { ...type.caption, color: colors.textFaint, textDecorationLine: 'underline', marginTop: spacing.lg },
});
