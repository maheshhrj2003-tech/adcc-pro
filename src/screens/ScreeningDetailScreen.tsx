import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { getScreeningBySlug, markScreeningWatched, submitScreeningReview } from '../api/screenings';
import { ApiError, ScreeningDetail } from '../api/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ScreeningDetail'>;

export default function ScreeningDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [watchedNote, setWatchedNote] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    // GET /screenings/{slug} — includes tracks not yet live (draft/in_review/
    // approved). A 403 here means no invitation for this title — distinct
    // from a generic error.
    getScreeningBySlug(slug)
      .then(setScreening)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) {
          setForbidden(true);
        } else {
          setError('Could not load this screening.');
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleStartWatching = async () => {
    // POST /screenings/{slug}/watched — call when the screener actually
    // opens/starts a track. Fires an admin notification on first watch only.
    try {
      await markScreeningWatched(slug);
      setWatchedNote('Watch recorded.');
    } catch {
      Alert.alert('Could not record watch', 'Try again in a moment.');
    }
  };

  const handleSubmitReview = async () => {
    setReviewError(null);
    if (!comment.trim()) {
      setReviewError('A comment is required.');
      return;
    }
    setSubmitting(true);
    try {
      // POST /screenings/{slug}/review — rating optional (1-5), comment
      // required. Fires an admin notification every time.
      await submitScreeningReview(slug, { rating: rating ?? undefined, comment: comment.trim() });
      setReviewSubmitted(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.body?.errors) {
        const first = Object.values(e.body.errors)[0]?.[0];
        setReviewError(first || 'Please check your review and try again.');
      } else {
        setReviewError('Could not submit your review. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (forbidden) {
    return (
      <View style={styles.screen}>
        <ChromeHeader title="Screening" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.textFaint} />
          <Text style={styles.errorText}>You don't have an invitation to screen this title.</Text>
        </View>
      </View>
    );
  }

  if (error || !screening) {
    return (
      <View style={styles.screen}>
        <ChromeHeader title="Screening" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ChromeHeader title={screening.title} subtitle="Pre-release screening" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          {screening.poster_url && (
            <ImageBackground source={{ uri: screening.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />
        </View>

        {screening.synopsis && <Text style={styles.synopsis}>{screening.synopsis}</Text>}

        <Text style={styles.sectionLabel}>TRACKS (INCLUDING UNRELEASED)</Text>
        {screening.languages.map((track) => (
          <View key={track.language.code} style={styles.trackCard}>
            <Text style={styles.trackLang}>{track.language.name}</Text>
            <View style={styles.trackBadges}>
              <View style={[styles.badge, !track.downloads.ad && styles.badgeOff]}>
                <Text style={[styles.badgeText, !track.downloads.ad && styles.badgeTextOff]}>AD</Text>
              </View>
              <View style={[styles.badge, !track.downloads.cc && styles.badgeOff]}>
                <Text style={[styles.badgeText, !track.downloads.cc && styles.badgeTextOff]}>CC</Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.watchBtn}
          onPress={handleStartWatching}
          accessibilityRole="button"
          accessibilityLabel="Start watching"
        >
          <Ionicons name="play-circle-outline" size={18} color={colors.bg} />
          <Text style={styles.watchBtnText}>Start Watching</Text>
        </TouchableOpacity>
        {watchedNote && <Text style={styles.watchedNote}>{watchedNote}</Text>}
        {screening.screening.last_watched_at && (
          <Text style={styles.watchedNote}>
            Last watched {new Date(screening.screening.last_watched_at).toLocaleString()}
          </Text>
        )}

        <Text style={styles.sectionLabel}>SUBMIT REVIEW</Text>
        {reviewSubmitted ? (
          <View style={styles.reviewDoneCard}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.reviewDoneText}>Review submitted. Thank you.</Text>
          </View>
        ) : (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Rating (optional)</Text>
            <View style={styles.starsRow} accessibilityRole="adjustable" accessibilityLabel="Rating" accessibilityValue={{ min: 1, max: 5, now: rating ?? 0 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(rating === n ? null : n)}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                  accessibilityState={{ selected: rating !== null && n <= rating }}
                >
                  <Ionicons
                    name={rating !== null && n <= rating ? 'star' : 'star-outline'}
                    size={26}
                    color={colors.gold}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reviewLabel} nativeID="commentLabel">Comment</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Narration timing, caption accuracy, anything the studio should know..."
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={4}
              accessibilityLabelledBy="commentLabel"
            />

            {reviewError && (
              <Text style={styles.reviewError} accessibilityRole="alert">{reviewError}</Text>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitReview}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Submit review"
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              {submitting ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.submitText}>Submit Review</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  content: { paddingBottom: spacing.xl },
  banner: { height: 180, backgroundColor: colors.surface },
  synopsis: { ...type.body, color: colors.textMuted, padding: spacing.md, lineHeight: 22 },
  sectionLabel: { ...type.label, color: colors.gold, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackLang: { ...type.body, color: colors.text, fontWeight: '700' },
  trackBadges: { flexDirection: 'row', gap: spacing.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1, borderColor: colors.goldDim },
  badgeOff: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  badgeText: { ...type.caption, color: colors.gold, fontWeight: '700' },
  badgeTextOff: { color: colors.textFaint },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  watchBtnText: { ...type.body, color: colors.bg, fontWeight: '700' },
  watchedNote: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.sm },
  reviewCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  reviewLabel: { ...type.caption, color: colors.textMuted },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  commentInput: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
    ...type.body,
  },
  reviewError: { ...type.caption, color: colors.danger },
  submitBtn: { backgroundColor: colors.gold, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', marginTop: spacing.xs },
  submitText: { ...type.body, color: colors.bg, fontWeight: '700' },
  reviewDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  reviewDoneText: { ...type.body, color: colors.text },
});
