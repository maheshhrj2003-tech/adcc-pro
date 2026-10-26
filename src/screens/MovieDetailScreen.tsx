import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getMovieBySlug } from '../api/catalog';
import { addFavorite, removeFavorite, getFavorites } from '../api/favorites';
import { getDownloadRecord, saveDownloadRecord, downloadMovieLanguageTracks, DownloadRecord } from '../api/downloads';
import { ApiError, ApiMovie, MovieLanguageTrack } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../preferences/PreferencesContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetail'>;

function formatRuntime(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const SYNOPSIS_PREVIEW_CHARS = 140;

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
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  // Download state for the currently-selected language — owns the whole
  // "download, then show Play" step, matching the reference flow (progress
  // bar on this screen, not a separate Download screen).
  const [downloadRecord, setDownloadRecord] = useState<DownloadRecord | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ cc: 0, ad: 0 });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMovieBySlug(slug)
      .then((m) => {
        setMovie(m);
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

  useEffect(() => {
    if (!isAuthenticated || !movie) return;
    getFavorites()
      .then((favs) => setIsFavorite(favs.some((f) => f.id === movie.id)))
      .catch(() => {});
  }, [isAuthenticated, movie?.id]);

  // Auto-download the selected language's tracks the moment this screen
  // knows which language is selected — Play being the only step means the
  // download has to start on its own, not wait for a tap.
  useEffect(() => {
    if (!selectedTrack || !movie) return;
    let cancelled = false;
    const languageCode = selectedTrack.language.code;

    (async () => {
      setDownloadError(null);
      const existing = await getDownloadRecord(slug, languageCode);
      if (cancelled) return;
      if (existing) {
        setDownloadRecord(existing);
        return;
      }

      setDownloadRecord(null);
      if (!selectedTrack.downloads.cc && !selectedTrack.downloads.ad) return;

      setDownloading(true);
      setDownloadProgress({ cc: 0, ad: 0 });
      try {
        const result = await downloadMovieLanguageTracks(slug, languageCode, {
          onCcProgress: (f) => !cancelled && setDownloadProgress((p) => ({ ...p, cc: f })),
          onAdProgress: (f) => !cancelled && setDownloadProgress((p) => ({ ...p, ad: f })),
        });
        if (cancelled) return;
        const record: DownloadRecord = {
          slug,
          trackId: result.trackId,
          title: movie.title,
          posterUrl: movie.poster_url,
          languageCode,
          languageName: selectedTrack.language.name,
          ccPath: result.ccPath,
          adPath: result.adPath,
          runtimeSeconds: result.runtimeSeconds,
          downloadedAt: new Date().toISOString(),
        };
        await saveDownloadRecord(record);
        if (!cancelled) setDownloadRecord(record);
      } catch (e) {
        if (!cancelled) setDownloadError(e instanceof Error ? e.message : 'Download failed. Try again.');
      } finally {
        if (!cancelled) setDownloading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, movie, selectedTrack]);

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
      <View style={[styles.screen, styles.centerFill]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={[styles.screen, styles.centerFill]}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} accessibilityRole="button" accessibilityLabel="Retry">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ready = !!downloadRecord;
  const overallProgress = (downloadProgress.cc + downloadProgress.ad) / 2;
  const synopsis = movie.synopsis ?? '';
  const synopsisTruncated = !synopsisExpanded && synopsis.length > SYNOPSIS_PREVIEW_CHARS;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <Text style={styles.brand} numberOfLines={1}>ADCC</Text>
          <Text style={styles.brandSub} numberOfLines={1}>PRO</Text>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={toggleFavorite}
          disabled={favoriteBusy}
          hitSlop={10}
          accessibilityRole="switch"
          accessibilityState={{ checked: isFavorite, busy: favoriteBusy }}
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? colors.danger : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.posterCard}>
          <ImageBackground source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </View>

        <Text style={styles.title}>{movie.title}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoCol}>
            <Text style={styles.infoValue}>{movie.release_year}</Text>
            <Text style={styles.infoLabel}>RELEASED</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <Text style={styles.infoValue}>{formatRuntime(selectedTrack?.runtime_seconds ?? null)}</Text>
            <Text style={styles.infoLabel}>RUNTIME</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <Text style={styles.infoValue} numberOfLines={1}>
              {selectedTrack?.language.name ?? movie.original_language.name}
            </Text>
            <Text style={styles.infoLabel}>LANGUAGE</Text>
          </View>
        </View>

        {movie.languages.length > 1 && (
          <View style={styles.langRow}>
            {movie.languages.map((track) => {
              const isSelected = selectedTrack?.language.code === track.language.code;
              return (
                <TouchableOpacity
                  key={track.language.code}
                  style={[styles.langPill, isSelected && styles.langPillActive]}
                  onPress={() => setSelectedTrack(track)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={track.language.name}
                >
                  <Text style={[styles.langText, isSelected && styles.langTextActive]}>{track.language.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedTrack && (
          <View style={styles.trackPillRow}>
            <View style={[styles.trackPill, !selectedTrack.downloads.ad && styles.trackPillOff]}>
              <Ionicons
                name={selectedTrack.downloads.ad ? 'checkmark' : 'close'}
                size={13}
                color={selectedTrack.downloads.ad ? colors.gold : colors.textFaint}
              />
              <Text style={[styles.trackPillText, !selectedTrack.downloads.ad && styles.trackPillTextOff]}>AD</Text>
            </View>
            <View style={[styles.trackPill, !selectedTrack.downloads.cc && styles.trackPillOff]}>
              <Ionicons
                name={selectedTrack.downloads.cc ? 'checkmark' : 'close'}
                size={13}
                color={selectedTrack.downloads.cc ? colors.gold : colors.textFaint}
              />
              <Text style={[styles.trackPillText, !selectedTrack.downloads.cc && styles.trackPillTextOff]}>CC</Text>
            </View>
          </View>
        )}

        {downloadError ? (
          <View style={styles.downloadErrorWrap}>
            <Text style={styles.downloadErrorText}>{downloadError}</Text>
            <TouchableOpacity
              onPress={() => setSelectedTrack((t) => (t ? { ...t } : t))}
              accessibilityRole="button"
              accessibilityLabel="Retry download"
            >
              <Text style={styles.retryInlineText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : ready ? (
          <TouchableOpacity
            style={styles.playBtn}
            activeOpacity={0.85}
            onPress={() => selectedTrack && navigation.navigate('Sync', { slug: movie.slug, language: selectedTrack.language.code })}
            accessibilityRole="button"
            accessibilityLabel="Play movie"
          >
            <Ionicons name="play" size={18} color={colors.text} />
            <Text style={styles.playBtnText}>PLAY MOVIE</Text>
          </TouchableOpacity>
        ) : downloading ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(overallProgress * 100)}%` }]} />
            <Text style={styles.progressText}>{Math.round(overallProgress * 100)}%</Text>
          </View>
        ) : (
          <Text style={styles.unavailableNote}>No downloadable tracks for this language yet.</Text>
        )}

        {synopsis.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionHeading}>Synopsis</Text>
            </View>
            <Text style={styles.synopsisText} numberOfLines={synopsisTruncated ? 3 : undefined}>
              {synopsis}
            </Text>
            {synopsis.length > SYNOPSIS_PREVIEW_CHARS && (
              <TouchableOpacity onPress={() => setSynopsisExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel="Toggle synopsis">
                <Text style={styles.readMore}>{synopsisExpanded ? 'Show less' : 'Read more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionHeading}>How it works</Text>
          </View>
          <View style={styles.howItem}>
            <Ionicons name="download-outline" size={18} color={colors.gold} />
            <Text style={styles.howText}>Download content to your device.</Text>
          </View>
          <View style={styles.howItem}>
            <Ionicons name="headset-outline" size={18} color={colors.gold} />
            <Text style={styles.howText}>Wear headphones for the best experience.</Text>
          </View>
          <View style={styles.howItem}>
            <Ionicons name="mic-outline" size={18} color={colors.gold} />
            <Text style={styles.howText}>Tap to sync — ADCC PRO listens and syncs to the movie automatically.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centerFill: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  retryText: { ...type.body, color: colors.text, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerIconBtn: { width: 32, alignItems: 'center' },
  brandRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 4 },
  brand: { ...type.h1, color: colors.text, letterSpacing: 1 },
  brandSub: { ...type.caption, color: colors.gold, fontWeight: '800', letterSpacing: 1 },
  content: { paddingBottom: spacing.xxl },
  posterCard: {
    alignSelf: 'center',
    width: '55%',
    aspectRatio: 2 / 3,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  title: { ...type.display, color: colors.text, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.md },
  infoCard: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  infoCol: { flex: 1, alignItems: 'center', gap: 2 },
  infoDivider: { width: 1, backgroundColor: colors.border },
  infoValue: { ...type.body, color: colors.text, fontWeight: '700' },
  infoLabel: { ...type.caption, color: colors.textFaint, fontSize: 10, letterSpacing: 0.5 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.md },
  langPill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  langPillActive: { borderColor: colors.gold, backgroundColor: 'rgba(230,51,43,0.12)' },
  langText: { ...type.caption, color: colors.textMuted, fontWeight: '700' },
  langTextActive: { color: colors.gold },
  trackPillRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  trackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(230,51,43,0.1)',
  },
  trackPillOff: { borderColor: colors.border, backgroundColor: 'transparent' },
  trackPillText: { ...type.caption, color: colors.gold, fontWeight: '800', fontSize: 11 },
  trackPillTextOff: { color: colors.textFaint },
  downloadErrorWrap: { alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.md, marginTop: spacing.lg },
  downloadErrorText: { ...type.caption, color: colors.danger, textAlign: 'center' },
  retryInlineText: { ...type.body, color: colors.gold, fontWeight: '700' },
  progressTrack: {
    height: 44,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold },
  progressText: { ...type.body, color: colors.text, fontWeight: '700', textAlign: 'center' },
  unavailableNote: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.lg },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  playBtnText: { ...type.h2, color: colors.text, letterSpacing: 1 },
  sectionBlock: { marginHorizontal: spacing.md, marginTop: spacing.xl },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: colors.gold },
  sectionHeading: { ...type.h2, color: colors.text },
  synopsisText: { ...type.body, color: colors.textMuted, lineHeight: 21 },
  readMore: { ...type.caption, color: colors.gold, fontWeight: '700', marginTop: spacing.xs },
  howItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  howText: { ...type.body, color: colors.textMuted, flex: 1 },
});
