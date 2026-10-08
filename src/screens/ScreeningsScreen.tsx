import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { getScreenings } from '../api/screenings';
import { ScreeningListItem } from '../api/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Screenings'>;

export default function ScreeningsScreen({ navigation }: Props) {
  const [screenings, setScreenings] = useState<ScreeningListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    // GET /screenings — titles this screener account has been invited to.
    getScreenings()
      .then(setScreenings)
      .catch(() => setError('Could not load your screenings.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <ChromeHeader title="My Screenings" subtitle="Pre-release access" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} accessibilityRole="button" accessibilityLabel="Retry">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={screenings}
          keyExtractor={(s) => s.movie.slug}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="eye-outline" size={32} color={colors.textFaint} />
              <Text style={styles.emptyText}>No screenings granted yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ScreeningDetail', { slug: item.movie.slug })}
              accessibilityRole="button"
              accessibilityLabel={`${item.movie.title}, ${item.first_watched_at ? 'watched' : 'not watched yet'}`}
            >
              {item.movie.poster_url ? (
                <Image source={{ uri: item.movie.poster_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="film-outline" size={20} color={colors.textFaint} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.movie.title}</Text>
                <Text style={styles.cardMeta}>
                  {item.first_watched_at ? 'Watched' : 'Not watched yet'}
                </Text>
                <Text style={styles.cardMetaFaint}>Granted {new Date(item.granted_at).toLocaleDateString()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.xxl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  retryText: { ...type.body, color: colors.bg, fontWeight: '700' },
  emptyText: { ...type.body, color: colors.textFaint },
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  thumb: { width: 52, height: 74, borderRadius: radius.sm },
  thumbPlaceholder: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { ...type.body, color: colors.text, fontWeight: '700' },
  cardMeta: { ...type.caption, color: colors.gold, marginTop: 2 },
  cardMetaFaint: { ...type.caption, color: colors.textFaint, marginTop: 2 },
});
