import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { getMovieBySlug } from '../api/catalog';
import { addFavorite, removeFavorite, getFavorites } from '../api/favorites';
import { ApiError, ApiMovie, MovieLanguageTrack } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../preferences/PreferencesContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetail'>;

function formatRuntime(seconds: number | null): string {
  if (seconds === null) return 'Runtime not listed';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MovieDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const { isAuthenticated } = useAuth();
  const { prefs } = usePreferences();

  const [movie, setMovie] = useState<ApiMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<MovieLanguageTrack | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMovieBySlug(slug)
      .then((m) => {
        setMovie(m);
        // Respect the user's default-language accessibility preference when
        // this title actually has a live track in it; otherwise fall back
        // to the first available track.
        const preferred = prefs.defaultLanguageCode
          ? m.languages.find((l) => l.language.code === prefs.defaultLanguageCode)
          : undefined;
        setSelectedTrack(preferred ?? m.languages[0] ?? null);
      })
      .catch((e) => {
        const message =
          e instanceof ApiError && e.status === 404
            ? 'This title is not available right now.'
            : 'Could not load this movie. Check your connection.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [slug, prefs.defaultLanguageCode]);

  useEffect(() => {
    load();
  }, [load]);

  // GET /favorites — check whether this title is already saved, so the
  // heart icon reflects real state rather than always starting unfavorited.
  useEffect(() => {
    if (!isAuthenticated || !movie) return;
    getFavorites()
      .then((favs) => setIsFavorite(favs.some((f) => f.id === movie.id)))
      .catch(() => {
        // Non-fatal — heart just falls back to its default state.
      });
  }, [isAuthenticated, movie?.id]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Create a free account to save favorites.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    if (!movie) return;
    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await removeFavorite(movie.id);
        setIsFavorite(false);
      } else {
        await addFavorite(movie.id);
        setIsFavorite(true);
      }
    } catch {
      Alert.alert('Something went wrong', 'Could not update favorites. Try again.');
    } finally {
      setFavoriteBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ChromeHeader title="Loading…" onBack={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={styles.screen}>
        <ChromeHeader title="Movie" onBack={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} accessibilityRole="button" accessibilityLabel="Retry">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const available = !!selectedTrack && (!!selectedTrack.downloads.cc || !!selectedTrack.downloads.ad);

  return (
    <View style={styles.screen}>
      <ChromeHeader
        title={movie.title}
        subtitle={`${movie.release_year}`}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={toggleFavorite}
            disabled={favoriteBusy}
            hitSlop={10}
            accessibilityRole="switch"
            accessibilityState={{ checked: isFavorite, busy: favoriteBusy }}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.danger : colors.bg}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <ImageBackground source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />
          <View style={styles.bannerBody}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>
              {movie.release_year} &middot; {movie.original_language.name}
            </Text>
          </View>
        </View>

        {movie.synopsis && <Text style={styles.synopsis}>{movie.synopsis}</Text>}

        <Text style={styles.sectionLabel}>SELECT LANGUAGE</Text>
        <View style={styles.langRow}>
          {movie.languages.map((track) => {
            const isSelected = selectedTrack?.language.code === track.language.code;
            return (
              <TouchableOpacity
                key={track.language.code}
                style={[styles.langPill, isSelected && styles.langPillActive]}
                onPress={() => setSelectedTrack(track)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={track.language.name}
              >
                <Text style={[styles.langText, isSelected && styles.langTextActive]}>{track.language.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {movie.languages.length === 0 && (
          <Text style={styles.unavailableNote}>No language tracks are live for this title yet.</Text>
        )}

        {selectedTrack && (
          <>
            <Text style={styles.sectionLabel}>ACCESSIBILITY TRACKS</Text>
            <View style={[styles.trackCard, !selectedTrack.downloads.ad && styles.trackCardDisabled]}>
              <View style={styles.trackIcon}>
                <Ionicons name="ear" size={20} color={selectedTrack.downloads.ad ? colors.gold : colors.textFaint} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle}>Audio Description</Text>
                <Text style={styles.trackFile}>
                  {selectedTrack.downloads.ad ? formatRuntime(selectedTrack.runtime_seconds) : 'Not available in this language'}
                </Text>
              </View>
            </View>
            <View style={[styles.trackCard, !selectedTrack.downloads.cc && styles.trackCardDisabled]}>
              <View style={styles.trackIcon}>
                <Ionicons name="text" size={20} color={selectedTrack.downloads.cc ? colors.gold : colors.textFaint} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle}>Closed Captions</Text>
                <Text style={styles.trackFile}>
                  {selectedTrack.downloads.cc ? formatRuntime(selectedTrack.runtime_seconds) : 'Not available in this language'}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footerBar}>
        <TouchableOpacity
          disabled={!available}
          style={[styles.downloadBtn, !available && styles.downloadBtnDisabled]}
          activeOpacity={0.85}
          onPress={() =>
            selectedTrack &&
            navigation.navigate('Player', { slug: movie.slug, language: selectedTrack.language.code, autoSync: true })
          }
          accessibilityRole="button"
          accessibilityLabel="Play"
          accessibilityState={{ disabled: !available }}
        >
          <Ionicons name="play" size={18} color={colors.bg} />
          <Text style={styles.downloadBtnText}>Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  retryText: { ...type.body, color: colors.bg, fontWeight: '700' },
  content: { paddingBottom: spacing.xl },
  banner: { height: 220, justifyContent: 'flex-end', backgroundColor: colors.surface },
  bannerBody: { padding: spacing.md },
  title: { ...type.display, color: colors.text },
  meta: { ...type.body, color: colors.textMuted, marginTop: 4 },
  synopsis: { ...type.body, color: colors.textMuted, padding: spacing.md, lineHeight: 22 },
  sectionLabel: { ...type.label, color: colors.gold, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
  langRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md, flexWrap: 'wrap' },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  langPillActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  langText: { ...type.body, color: colors.textMuted, fontWeight: '600' },
  langTextActive: { color: colors.gold },
  unavailableNote: { ...type.caption, color: colors.textFaint, marginHorizontal: spacing.md, marginTop: spacing.sm },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackCardDisabled: { opacity: 0.5 },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1 },
  trackTitle: { ...type.body, color: colors.text, fontWeight: '700' },
  trackFile: { ...type.caption, color: colors.textFaint, marginTop: 2 },
  footerBar: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  downloadBtnDisabled: { backgroundColor: colors.surfaceRaised },
  downloadBtnText: { ...type.h2, color: colors.bg },
});
