import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNowPlaying } from '../playback/NowPlayingContext';
import { navigationRef } from '../navigation/navigationRef';
import { colors, radius, spacing, type } from '../theme';

// Rendered once at the app root (see App.tsx), above the navigator, so it
// floats over whichever screen is currently showing. Only visible once a
// PlayerScreen session has been minimized (see NowPlayingContext) — i.e.
// the user backed out of the full player while something was playing.
export default function FloatingMiniPlayer() {
  const insets = useSafeAreaInsets();
  const { record, sound, playing, positionSec, durationSec, minimized, setPlaying, stop } = useNowPlaying();

  if (!record || !minimized) return null;

  const progress = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;

  const togglePlay = async () => {
    if (sound) {
      if (playing) await sound.pauseAsync();
      else await sound.playAsync();
    } else {
      setPlaying((p) => !p);
    }
  };

  const openFull = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Player', { slug: record.slug, language: record.languageCode });
    }
  };

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.md }]}>
      <TouchableOpacity
        style={styles.body}
        activeOpacity={0.85}
        onPress={openFull}
        accessibilityRole="button"
        accessibilityLabel={`Reopen ${record.title} player`}
      >
        <Image source={{ uri: record.posterUrl }} style={styles.thumb} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{record.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{record.languageName}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={togglePlay}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause' : 'Play'}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => stop()}
        accessibilityRole="button"
        accessibilityLabel="Close and stop playback"
      >
        <Ionicons name="close" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface },
  info: { flex: 1, gap: 2 },
  title: { ...type.body, color: colors.text, fontWeight: '700', fontSize: 13 },
  subtitle: { ...type.caption, color: colors.textFaint, fontSize: 10 },
  progressTrack: { height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginTop: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.gold },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
