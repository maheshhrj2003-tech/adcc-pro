import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getDownloadRecord, saveDownloadRecord, downloadMovieLanguageTracks, DownloadRecord } from '../api/downloads';
import { getMovieBySlug } from '../api/catalog';
import { syncTrack } from '../api/sync';
import { ApiError } from '../api/types';
import { parseSrt, SrtCue } from '../utils/srt';
import { usePreferences, CAPTION_SIZE_PT, CAPTION_COLOR_HEX } from '../preferences/PreferencesContext';
import { useNowPlaying } from '../playback/NowPlayingContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function PlayerScreen({ route, navigation }: Props) {
  const { slug, language, autoSync } = route.params;
  const insets = useSafeAreaInsets();
  const { prefs, loading: prefsLoading } = usePreferences();
  const now = useNowPlaying();

  // A ref mirror of the latest context value, read only from the unmount
  // cleanup below — that effect has empty deps (it must only fire on a true
  // unmount, not on every context update), so it can't close over `now`
  // directly without going stale. Updating a ref on every render keeps it
  // current without re-subscribing the effect.
  const nowRef = useRef(now);
  nowRef.current = now;

  // This screen only "owns" the UI for this slug+language while the shared
  // session actually matches it — otherwise another title may be mid
  // hand-off (or still minimized) and we shouldn't render its data here.
  const sessionActive = now.matches(slug, language);
  const record = sessionActive ? now.record : null;
  const cues = sessionActive ? now.cues : [];
  const sound = sessionActive ? now.sound : null;
  const positionSec = sessionActive ? now.positionSec : 0;
  const durationSec = sessionActive ? now.durationSec : 0;
  const playing = sessionActive ? now.playing : false;
  const adOn = sessionActive ? now.adOn : true;

  const [loading, setLoading] = useState(true);
  const [trackWidth, setTrackWidth] = useState(1);
  const manualClock = useRef<ReturnType<typeof setInterval> | null>(null);

  // Theater mode — activated automatically once auto-sync finds a match
  // (see startAutoSync below). A full black, captions-only view for
  // watching in a dark theater without a distracting UI or screen glow.
  const [theaterMode, setTheaterMode] = useState(false);
  const [theaterLocked, setTheaterLocked] = useState(false);
  // Shared across both the normal and theater views, so caption size stays
  // consistent whichever screen you adjust it from or switch between.
  const [captionBoost, setCaptionBoost] = useState(0);
  const increaseCaptionSize = () => setCaptionBoost((v) => Math.min(24, v + 4));
  const decreaseCaptionSize = () => setCaptionBoost((v) => Math.max(-8, v - 4));

  // The app is locked to portrait everywhere else (app.json), but this
  // screen unlocks rotation so theater mode can go fullscreen landscape
  // when the phone is rotated (matching the reference ADX app) — rotation
  // no longer exits theater mode, it just lets the black/captions view
  // fill a landscape screen. Exiting is now an explicit close button.
  // Restore the app-wide portrait lock on leaving so no other screen is
  // affected.
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // Deliberate exit from theater mode (close button) — snap back to
  // portrait so the normal player screen isn't left sideways, then
  // re-unlock so the user can still rotate back into theater-fullscreen.
  const exitTheaterMode = () => {
    setTheaterMode(false);
    setTheaterLocked(false);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      .then(() => ScreenOrientation.unlockAsync())
      .catch(() => {});
  };

  // Leaving this screen (back button, swipe-back, hardware back) hands the
  // live session off to the floating mini-player instead of stopping it —
  // only if this screen actually owns a live session for this title. This
  // must be a separate effect with empty deps so its cleanup runs on true
  // unmount only, never when unrelated state changes mid-session.
  useEffect(() => {
    return () => {
      if (nowRef.current.matches(slug, language)) {
        nowRef.current.minimize();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Without this, expo-av can report isPlaying: true and keep advancing
  // playback position (which is what drives the captions) while producing
  // no actual audible output — position tracking and audible sound are
  // decoupled unless the audio session/mode is explicitly configured.
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // Prepare this title for playback: reuse a previously downloaded copy if
  // one exists, otherwise download it now — pressing Play is the only step,
  // there's no separate Download screen to click through first. Waits for
  // accessibility preferences to finish loading first, so the AD mute state
  // reflects the actual saved preference, not a stale default.
  const [prepError, setPrepError] = useState<string | null>(null);
  const [prepProgress, setPrepProgress] = useState({ cc: 0, ad: 0 });
  const [preparing, setPreparing] = useState(false);
  // True only when this mount actually built a fresh session (as opposed to
  // restoring one that was already live/minimized) — gates auto-sync below
  // so re-opening something you're already watching never kicks off a new
  // 15-second mic recording on top of it.
  const freshLoadRef = useRef(false);

  useEffect(() => {
    if (prefsLoading) return;
    let cancelled = false;

    (async () => {
      // Same title+language already live (playing or minimized) — just
      // bring it back into view, don't re-download or re-create the sound.
      if (now.matches(slug, language)) {
        now.restore();
        setLoading(false);
        return;
      }

      // A different title is live — stop it before starting a new one, so
      // two movies never play over each other.
      if (now.record) {
        await now.stop();
      }
      if (cancelled) return;

      setLoading(true);
      let rec = await getDownloadRecord(slug, language);
      if (cancelled) return;

      if (!rec) {
        try {
          setPreparing(true);
          if (__DEV__) console.log('[player] not downloaded yet — downloading now for', slug, language);
          const movie = await getMovieBySlug(slug);
          if (cancelled) return;
          const track = movie.languages.find((l) => l.language.code === language);
          const result = await downloadMovieLanguageTracks(slug, language, {
            onCcProgress: (f) => !cancelled && setPrepProgress((p) => ({ ...p, cc: f })),
            onAdProgress: (f) => !cancelled && setPrepProgress((p) => ({ ...p, ad: f })),
          });
          if (cancelled) return;
          rec = {
            slug,
            trackId: result.trackId,
            title: movie.title,
            posterUrl: movie.poster_url,
            languageCode: language,
            languageName: track?.language.name ?? language,
            ccPath: result.ccPath,
            adPath: result.adPath,
            runtimeSeconds: result.runtimeSeconds,
            downloadedAt: new Date().toISOString(),
          };
          await saveDownloadRecord(rec);
        } catch (e) {
          if (!cancelled) {
            setPrepError(e instanceof Error ? e.message : 'Could not prepare this title for playback.');
            setLoading(false);
          }
          return;
        } finally {
          if (!cancelled) setPreparing(false);
        }
      }

      if (cancelled) return;

      let parsedCues: SrtCue[] = [];
      if (rec.ccPath) {
        try {
          const content = await FileSystem.readAsStringAsync(rec.ccPath);
          parsedCues = parseSrt(content);
        } catch {
          parsedCues = [];
        }
      }
      if (cancelled) return;

      let loadedSound: Audio.Sound | null = null;
      let initialAdOn = true;
      if (rec.adPath) {
        try {
          initialAdOn = prefs.adEnabledByDefault;
          if (__DEV__) console.log('[player] loading AD sound from', rec.adPath, 'isMuted:', !initialAdOn);
          const { sound: loaded } = await Audio.Sound.createAsync(
            { uri: rec.adPath },
            { shouldPlay: false, isMuted: !initialAdOn, volume: 1.0 }
          );
          if (cancelled) {
            loaded.unloadAsync();
            return;
          }
          if (__DEV__) console.log('[player] AD sound loaded OK');
          loaded.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
              if (__DEV__ && 'error' in status && status.error) console.log('[player] playback error:', status.error);
              return;
            }
            now.setPositionSec(status.positionMillis / 1000);
            if (status.durationMillis) now.setDurationSec(status.durationMillis / 1000);
            now.setPlaying(status.isPlaying);
          });
          loadedSound = loaded;
        } catch (e) {
          // AD audio failed to load — captions still work off the manual clock.
          if (__DEV__) console.log('[player] AD sound FAILED to load:', e);
        }
      }

      if (cancelled) return;
      now.attach(rec, loadedSound, parsedCues, initialAdOn);
      if (!loadedSound) {
        now.setDurationSec(rec.runtimeSeconds || (parsedCues.length ? parsedCues[parsedCues.length - 1].end : 60));
      }
      freshLoadRef.current = true;

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (manualClock.current) clearInterval(manualClock.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, language, prefsLoading]);

  const hasAudio = !!record?.adPath;

  // When there's no AD audio to anchor to, drive captions off a manual clock
  // the user starts themselves — this only runs while the full screen is
  // mounted, so a caption-only session pauses its clock while minimized
  // (there's no audio playing in the background to keep it worth ticking).
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

  // Keep the loaded sound's mute state in sync with the on-screen AD toggle.
  useEffect(() => {
    sound?.setIsMutedAsync(!adOn);
  }, [adOn, sound]);

  const toggleAd = () => {
    if (!hasAudio) return;
    now.setAdOn((v) => !v);
  };

  const togglePlay = async () => {
    if (sound) {
      if (playing) {
        if (__DEV__) console.log('[player] pauseAsync');
        await sound.pauseAsync();
      } else {
        if (__DEV__) console.log('[player] playAsync, adOn:', adOn);
        await sound.playAsync();
      }
    } else {
      if (__DEV__) console.log('[player] no sound loaded — using manual clock only');
      now.setPlaying((p) => !p);
    }
  };

  const seekTo = async (fraction: number) => {
    const target = fraction * durationSec;
    if (sound) {
      await sound.setPositionAsync(target * 1000);
    } else {
      now.setPositionSec(target);
    }
  };

  // Manual re-sync — the app-side action the API doc calls out (no server
  // endpoint for this; it's purely a client concern). This actually seeks
  // the master clock (the real audio position when AD exists, or the
  // manual clock when it doesn't) by the nudge amount, so captions — which
  // are derived from that same clock below — move together with the audio
  // rather than drifting apart from it. `totalNudgeMs` is just the running
  // total shown to the user, so Reset can undo exactly what was nudged.
  const [totalNudgeMs, setTotalNudgeMs] = useState(0);

  const nudgeSync = async (deltaMs: number) => {
    const targetSec = Math.max(0, Math.min(durationSec || Infinity, positionSec + deltaMs / 1000));
    if (__DEV__) console.log('[player] nudging sync by', deltaMs, 'ms -> seeking to', targetSec, 's');
    if (sound) {
      await sound.setPositionAsync(targetSec * 1000);
    } else {
      now.setPositionSec(targetSec);
    }
    setTotalNudgeMs((v) => v + deltaMs);
  };

  const resetSync = async () => {
    if (totalNudgeMs === 0) return;
    const targetSec = Math.max(0, positionSec - totalNudgeMs / 1000);
    if (sound) {
      await sound.setPositionAsync(targetSec * 1000);
    } else {
      now.setPositionSec(targetSec);
    }
    setTotalNudgeMs(0);
  };

  // Mic-based auto-sync — POST /tracks/{id}/sync. Records a short mic
  // sample, uploads it, and if the server finds a confident match, seeks
  // playback to that point. Not part of the original API reference doc;
  // confirmed live and verified directly against the backend on 2026-09-28.
  const RECORDING_SECONDS = 15;
  const [micState, setMicState] = useState<'idle' | 'requesting' | 'recording' | 'matching'>('idle');
  const [countdown, setCountdown] = useState(RECORDING_SECONDS);
  const [micMessage, setMicMessage] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncAutoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoSync = async () => {
    if (!record) return;
    if (syncAutoDismissTimer.current) clearTimeout(syncAutoDismissTimer.current);
    setMicMessage(null);

    setMicState('requesting');
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      setMicState('idle');
      setMicMessage('Microphone permission is required to auto-sync.');
      return;
    }

    // Pausing our own AD playback while recording avoids picking up our own
    // narration through the mic instead of the theater/disc audio we're
    // actually trying to match against.
    const wasPlaying = playing;
    if (sound && wasPlaying) {
      await sound.pauseAsync();
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      const recordingStartedAt = Date.now();

      setMicState('recording');
      setCountdown(RECORDING_SECONDS);
      countdownTimer.current = setInterval(() => {
        setCountdown((c) => (c > 1 ? c - 1 : c));
      }, 1000);

      await new Promise((resolve) => setTimeout(resolve, RECORDING_SECONDS * 1000));

      if (countdownTimer.current) clearInterval(countdownTimer.current);
      await recording.stopAndUnloadAsync();
      // Hand the mic back to playback-only mode so AD audio quality/routing
      // isn't affected by the recording-capable session afterward.
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true });

      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('Recording produced no file.');

      setMicState('matching');
      const result = await syncTrack(record.trackId, uri);

      // Correct for how long the record → upload → match round trip took —
      // offset_seconds reflects where the film was when recording *started*.
      const elapsedSec = (Date.now() - recordingStartedAt) / 1000;

      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      if (result.matched) {
        const correctedSec = Math.max(0, result.offset_seconds + elapsedSec);
        if (sound) {
          await sound.setPositionAsync(correctedSec * 1000);
        } else {
          now.setPositionSec(correctedSec);
        }
        setTotalNudgeMs(0);
        setMicMessage('Synced!');
        setTheaterMode(true);
        // A match needs no manual confirmation — the movie's already
        // playing behind the overlay by this point, so just show "Synced!"
        // briefly and drop straight into theater mode on its own. A failed
        // match still needs the manual Continue, since there's no automatic
        // next step to walk into.
        if (syncAutoDismissTimer.current) clearTimeout(syncAutoDismissTimer.current);
        syncAutoDismissTimer.current = setTimeout(() => setMicMessage(null), 1300);
      } else {
        setMicMessage("Couldn't find a confident match — try holding the phone closer to the audio source and try again.");
      }

      // Sync is meant to be hands-off end to end — whether or not a match
      // was found, playback should already be underway by the time it's
      // done, never left paused waiting for a manual Play tap.
      if (sound) {
        await sound.playAsync();
      } else {
        now.setPlaying(true);
      }
    } catch (e) {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (e instanceof ApiError && e.status === 422) {
        setMicMessage(e.message);
      } else {
        setMicMessage('Auto-sync failed. Check your connection and try again.');
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true }).catch(() => {});
    } finally {
      setMicState('idle');
    }
  };

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (syncAutoDismissTimer.current) clearTimeout(syncAutoDismissTimer.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // Pressing Play directly (from the movie detail screen) is the only step
  // now — once the title is prepared and loaded, kick off the mic auto-sync
  // automatically instead of waiting for a manual button tap, matching the
  // reference app's flow of Play -> sync -> "Synced!" -> theater mode.
  // Replaying an already-downloaded title from the Downloads library
  // (autoSync not set) never triggers this — sync is a "direct play" thing.
  const autoSyncFired = useRef(false);
  useEffect(() => {
    if (!autoSync) return;
    if (!freshLoadRef.current) return;
    if (!loading && record && !autoSyncFired.current) {
      autoSyncFired.current = true;
      startAutoSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, record]);

  // The full-screen sync overlay covers the in-progress states AND the
  // just-finished result (so there's a moment to read "Synced!" or the
  // no-match message and hit Resync) — it clears once the user dismisses it.
  const showSyncOverlay = micState !== 'idle' || micMessage !== null;

  const currentCue = useMemo(
    () => cues.find((c) => positionSec >= c.start && positionSec < c.end),
    [cues, positionSec]
  );

  const progress = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;

  if (prepError) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
        <Text style={styles.errorText}>{prepError}</Text>
        <TouchableOpacity
          style={styles.backBtnFallback}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
        {preparing && (
          <>
            <Text style={styles.prepText}>Preparing your accessibility tracks…</Text>
            <Text style={styles.prepSubtext}>
              {Math.round(((prepProgress.cc + prepProgress.ad) / 2) * 100)}%
            </Text>
          </>
        )}
      </View>
    );
  }

  if (!record) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
        <Text style={styles.errorText}>This title couldn't be prepared for playback.</Text>
        <TouchableOpacity
          style={styles.backBtnFallback}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const syncOverlay = showSyncOverlay && (
    <View style={styles.syncOverlay}>
      <TouchableOpacity
        style={styles.syncOverlayClose}
        onPress={() => setMicMessage(null)}
        disabled={micState !== 'idle'}
        accessibilityRole="button"
        accessibilityLabel="Dismiss sync screen"
      >
        <Ionicons name="close" size={22} color={micState === 'idle' ? colors.text : colors.textFaint} />
      </TouchableOpacity>

      <View style={styles.syncOverlayBody}>
        <View style={styles.syncOverlayIconWrap}>
          <Ionicons name="mic" size={36} color={colors.gold} />
        </View>

        {micState === 'requesting' && (
          <>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={styles.syncOverlayTitle}>Requesting microphone permission…</Text>
          </>
        )}
        {micState === 'recording' && (
          <>
            <View style={styles.micRecordingDotLg} />
            <Text style={styles.syncOverlayTitle}>Listening…</Text>
            <Text style={styles.syncOverlaySubtitle}>
              {countdown}s remaining — hold your phone up to the movie's audio
            </Text>
          </>
        )}
        {micState === 'matching' && (
          <>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={styles.syncOverlayTitle}>Matching against the film…</Text>
          </>
        )}
        {micState === 'idle' && micMessage && <Text style={styles.syncOverlayTitle}>{micMessage}</Text>}
      </View>

      <View style={[styles.syncOverlayActions, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.syncOverlayResyncBtn, micState !== 'idle' && styles.syncOverlayBtnDisabled]}
          onPress={startAutoSync}
          disabled={micState !== 'idle'}
          accessibilityRole="button"
          accessibilityLabel="Resync"
        >
          <Ionicons name="refresh" size={18} color={colors.bg} />
          <Text style={styles.syncOverlayResyncText}>Resync</Text>
        </TouchableOpacity>
        {micState === 'idle' && (
          <TouchableOpacity
            style={styles.syncOverlayContinueBtn}
            onPress={() => setMicMessage(null)}
            accessibilityRole="button"
            accessibilityLabel="Continue watching"
          >
            <Text style={styles.syncOverlayContinueText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (theaterMode) {
    const captionSize = CAPTION_SIZE_PT[prefs.captionSize] + captionBoost;
    return (
      <View style={styles.theaterScreen}>
        {!theaterLocked && (
          <View style={[styles.theaterTopBar, { top: insets.top + spacing.sm }]}>
            <TouchableOpacity
              style={styles.theaterCloseBtn}
              onPress={exitTheaterMode}
              accessibilityRole="button"
              accessibilityLabel="Exit theater mode"
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
                <TouchableOpacity
                  style={styles.theaterBtnSmall}
                  onPress={decreaseCaptionSize}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease caption size"
                >
                  <Ionicons name="text" size={16} color={colors.gold} />
                  <Ionicons name="remove" size={11} color={colors.gold} style={styles.theaterBtnBadge} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.theaterBtnSmall}
                  onPress={increaseCaptionSize}
                  accessibilityRole="button"
                  accessibilityLabel="Increase caption size"
                >
                  <Ionicons name="text" size={22} color={colors.gold} />
                  <Ionicons name="add" size={12} color={colors.gold} style={styles.theaterBtnBadge} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.theaterBtnSmall}
                  onPress={startAutoSync}
                  accessibilityRole="button"
                  accessibilityLabel="Resync using the microphone"
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

        {syncOverlay}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.videoArea}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="chevron-down" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarTitleWrap}>
            <Text style={styles.topBarTitle} numberOfLines={1}>{record.title}</Text>
            <Text style={styles.topBarSubtitle}>{record.languageName}</Text>
          </View>
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

        <TouchableOpacity
          style={styles.centerPlay}
          activeOpacity={0.8}
          onPress={togglePlay}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause' : 'Play'}
        >
          <View style={styles.centerPlayCircle}>
            <Ionicons name={playing ? 'pause' : 'play'} size={30} color={colors.text} />
          </View>
        </TouchableOpacity>

        {currentCue && (
          <View style={styles.captionWrap} pointerEvents="none">
            <Text
              style={[
                styles.captionText,
                { fontSize: CAPTION_SIZE_PT[prefs.captionSize] + captionBoost, color: CAPTION_COLOR_HEX[prefs.captionColor] },
              ]}
            >
              {currentCue.text}
            </Text>
          </View>
        )}

        <View style={[styles.bottomBar, { paddingBottom: spacing.md }]}>
          <View style={styles.syncRow}>
            <View style={styles.syncPill}>
              <View style={[styles.syncDot, { backgroundColor: cues.length ? colors.success : colors.textFaint }]} />
              <Text style={styles.syncText}>{cues.length ? 'CC loaded' : 'No CC track'}</Text>
            </View>
            <View style={styles.syncPill}>
              <View style={[styles.syncDot, { backgroundColor: hasAudio && adOn ? colors.success : colors.textFaint }]} />
              <Text style={styles.syncText}>
                {!hasAudio ? 'Manual clock (no AD track)' : adOn ? 'AD synced to playback' : 'AD muted'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.captionSizeBtn}
              onPress={decreaseCaptionSize}
              accessibilityRole="button"
              accessibilityLabel="Decrease caption size"
            >
              <Ionicons name="remove" size={14} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captionSizeBtn}
              onPress={increaseCaptionSize}
              accessibilityRole="button"
              accessibilityLabel="Increase caption size"
            >
              <Ionicons name="add" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={1}
            style={styles.timelineTrack}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 1)}
            onPress={(e) => seekTo(Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth)))}
            accessibilityRole="adjustable"
            accessibilityLabel="Playback position"
            accessibilityValue={{ text: `${formatTime(positionSec)} of ${formatTime(durationSec)}` }}
            accessibilityActions={[
              { name: 'increment', label: 'Skip forward 10 seconds' },
              { name: 'decrement', label: 'Skip back 10 seconds' },
            ]}
            onAccessibilityAction={(e) => {
              if (durationSec <= 0) return;
              const delta = 10 / durationSec;
              if (e.nativeEvent.actionName === 'increment') seekTo(Math.min(1, progress + delta));
              if (e.nativeEvent.actionName === 'decrement') seekTo(Math.max(0, progress - delta));
            }}
          >
            <View style={[styles.timelineFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.scrubber, { left: `${progress * 100}%` }]} />
          </TouchableOpacity>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionSec)}</Text>
            <Text style={styles.timeText}>{formatTime(durationSec)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Now Playing</Text>
        <View style={styles.infoRow}>
          <Ionicons name="ear" size={16} color={colors.gold} />
          <Text style={styles.infoLabel}>Audio Description</Text>
          <Text style={styles.infoFile} numberOfLines={1}>
            {record.adPath ? 'Ready' : 'Not available'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="text" size={16} color={colors.gold} />
          <Text style={styles.infoLabel}>Closed Captions</Text>
          <Text style={styles.infoFile} numberOfLines={1}>
            {record.ccPath ? 'Ready' : 'Not available'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.resyncBtn}
          onPress={startAutoSync}
          accessibilityRole="button"
          accessibilityLabel="Resync using the microphone"
        >
          <Ionicons name="mic" size={16} color={colors.gold} />
          <Text style={styles.resyncBtnText}>Resync</Text>
        </TouchableOpacity>

        <View style={styles.syncNudgeCard}>
          <View style={styles.syncNudgeHeader}>
            <Text style={styles.syncNudgeTitle}>{hasAudio ? 'Manual Fine-Tune' : 'Caption Sync'}</Text>
            <TouchableOpacity
              onPress={resetSync}
              disabled={totalNudgeMs === 0}
              accessibilityRole="button"
              accessibilityLabel="Reset sync offset"
            >
              <Text style={[styles.syncNudgeReset, totalNudgeMs === 0 && styles.syncNudgeResetDisabled]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.syncNudgeRow}>
            <TouchableOpacity
              style={styles.syncNudgeBtn}
              onPress={() => nudgeSync(-500)}
              accessibilityRole="button"
              accessibilityLabel="Rewind half a second to sync earlier"
            >
              <Ionicons name="play-back" size={16} color={colors.gold} />
            </TouchableOpacity>
            <Text style={styles.syncNudgeValue}>
              {totalNudgeMs === 0 ? 'In sync' : `${totalNudgeMs > 0 ? '+' : ''}${totalNudgeMs}ms`}
            </Text>
            <TouchableOpacity
              style={styles.syncNudgeBtn}
              onPress={() => nudgeSync(500)}
              accessibilityRole="button"
              accessibilityLabel="Skip forward half a second to sync later"
            >
              <Ionicons name="play-forward" size={16} color={colors.gold} />
            </TouchableOpacity>
          </View>
          <Text style={styles.syncNudgeHint}>
            {hasAudio
              ? "Nudges both the audio and captions together, so they stay locked to each other while you align them to what you're watching."
              : "Nudges the caption clock — there's no AD track for this language, so only captions are affected."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.syncDetailBtn}
          onPress={() => navigation.navigate('Sync', { slug, language })}
          accessibilityRole="button"
          accessibilityLabel="View sync status"
        >
          <Text style={styles.syncDetailText}>View sync status</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {syncOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  backBtnFallback: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  backBtnFallbackText: { ...type.body, color: colors.bg, fontWeight: '700' },
  prepText: { ...type.body, color: colors.textMuted, marginTop: spacing.md },
  prepSubtext: { ...type.caption, color: colors.gold, fontWeight: '700', marginTop: spacing.xs },
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
  theaterBtnBadge: { position: 'absolute', top: 4, right: 4 },
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
  videoArea: { aspectRatio: 16 / 10, justifyContent: 'space-between', backgroundColor: '#000000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: { flex: 1 },
  topBarTitle: { ...type.body, color: colors.text, fontWeight: '700' },
  topBarSubtitle: { ...type.caption, color: colors.textMuted },
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
  centerPlay: { alignItems: 'center', justifyContent: 'center' },
  centerPlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionText: {
    ...type.body,
    color: colors.text,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bottomBar: { paddingHorizontal: spacing.md },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  syncDot: { width: 6, height: 6, borderRadius: 3 },
  captionSizeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  syncText: { ...type.caption, color: colors.text, fontSize: 10 },
  timelineTrack: {
    height: 16,
    justifyContent: 'center',
  },
  timelineFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  scrubber: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    marginLeft: -6,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  timeText: { ...type.caption, color: colors.textMuted, fontSize: 10 },
  infoPanel: { padding: spacing.md, gap: spacing.md },
  infoTitle: { ...type.label, color: colors.gold },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { ...type.body, color: colors.text, fontWeight: '600', width: 150 },
  infoFile: { ...type.caption, color: colors.textFaint, flex: 1 },
  resyncBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.goldDim,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  resyncBtnText: { ...type.caption, color: colors.gold, fontWeight: '700' },
  syncOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  syncOverlayClose: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    margin: spacing.md,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncOverlayBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  syncOverlayIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  syncOverlayTitle: { ...type.h2, color: colors.text, textAlign: 'center' },
  syncOverlaySubtitle: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  micRecordingDotLg: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
  },
  syncOverlayActions: { padding: spacing.lg, gap: spacing.sm },
  syncOverlayResyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  syncOverlayBtnDisabled: { opacity: 0.4 },
  syncOverlayResyncText: { ...type.body, color: colors.bg, fontWeight: '700' },
  syncOverlayContinueBtn: { alignItems: 'center', paddingVertical: 10 },
  syncOverlayContinueText: { ...type.body, color: colors.textMuted, fontWeight: '600' },
  syncNudgeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  syncNudgeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  syncNudgeTitle: { ...type.label, color: colors.gold },
  syncNudgeReset: { ...type.caption, color: colors.gold, fontWeight: '700' },
  syncNudgeResetDisabled: { color: colors.textFaint },
  syncNudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  syncNudgeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncNudgeValue: { ...type.body, color: colors.text, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  syncNudgeHint: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.sm, lineHeight: 16 },
  syncDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  syncDetailText: { ...type.body, color: colors.gold, fontWeight: '600' },
});
