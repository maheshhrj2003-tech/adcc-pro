import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { getFavorites, removeFavorite } from '../api/favorites';
import { FavoriteMovie } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export default function FavoritesScreen({ navigation }: Props) {
  const { role } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    // GET /favorites — auth required, not paginated, no `languages` key.
    getFavorites()
      .then(setFavorites)
      .catch(() => setError('Could not load your favorites.'))
      .finally(() => setLoading(false));
  }, []);

  // Favorites is audience-only UI — a screener account shouldn't reach it
  // (defense in depth alongside hiding it from the Menu).
  useFocusEffect(
    useCallback(() => {
      if (role === 'screener') {
        navigation.reset({ index: 0, routes: [{ name: 'Screenings' }] });
        return;
      }
      load();
    }, [load, role])
  );

  const handleRemove = async (movie: FavoriteMovie) => {
    setFavorites((prev) => prev.filter((f) => f.id !== movie.id));
    try {
      await removeFavorite(movie.id);
    } catch {
      // Revert on failure.
      setFavorites((prev) => [movie, ...prev]);
    }
  };

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Favorites" onBack={() => navigation.goBack()} />

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
          data={favorites}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="heart-outline" size={32} color={colors.textFaint} />
              <Text style={styles.emptyText}>No favorites yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MovieDetail', { slug: item.slug })}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.release_year}`}
            >
              <Image source={{ uri: item.poster_url }} style={styles.thumb} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.release_year} &middot; {item.original_language.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.title} from favorites`}
              >
                <Ionicons name="heart" size={20} color={colors.gold} />
              </TouchableOpacity>
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
  cardBody: { flex: 1 },
  cardTitle: { ...type.body, color: colors.text, fontWeight: '700' },
  cardMeta: { ...type.caption, color: colors.textFaint, marginTop: 2 },
  removeBtn: { padding: spacing.sm },
});
