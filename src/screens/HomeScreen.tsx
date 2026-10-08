import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Animated,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeFooter from '../components/ChromeFooter';
import { handleFooterNav } from '../navigation/footerNav';
import { getLanguages, getMovies } from '../api/catalog';
import { ApiError, ApiLanguage, ApiMovie } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const AUTO_ADVANCE_MS = 3000;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();

  // Screener accounts get an isolated flow (browse only their invited
  // titles) — the regular catalog/browse UI shouldn't apply to them. This
  // catches a screener session restored on app boot, since Home is always
  // the initial route regardless of role.
  useFocusEffect(
    useCallback(() => {
      if (role === 'screener') {
        navigation.reset({ index: 0, routes: [{ name: 'Screenings' }] });
      }
    }, [role])
  );

  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [heroIndex, setHeroIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // GET /languages — populates the language filter row.
  useEffect(() => {
    getLanguages()
      .then(setLanguages)
      .catch(() => {
        // Non-fatal: the language filter just stays empty (All only).
      });
  }, []);

  const fetchMovies = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        // GET /movies — public, paginated, filterable by language + search.
        const res = await getMovies({
          page: targetPage,
          language: activeLanguage ?? undefined,
          search: query.trim() || undefined,
        });
        setMovies((prev) => (replace ? res.data : [...prev, ...res.data]));
        setPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        setHeroIndex(0);
      } catch (e) {
        const message =
          e instanceof ApiError ? e.message : 'Could not reach the ADCC catalog. Check your connection.';
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeLanguage, query]
  );

  useEffect(() => {
    fetchMovies(1, true);
  }, [activeLanguage]);

  // Debounce search input before hitting the API — skip the very first run
  // so mount doesn't double-fire GET /movies alongside the effect above.
  const isFirstQueryRun = useRef(true);
  useEffect(() => {
    if (isFirstQueryRun.current) {
      isFirstQueryRun.current = false;
      return;
    }
    const timer = setTimeout(() => fetchMovies(1, true), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (movies.length < 2) return;
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setHeroIndex((i) => (i + 1) % movies.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [movies.length]);

  const featured = movies[heroIndex];

  const canLoadMore = page < lastPage;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {}}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          <View style={styles.badgeDot} />
        </TouchableOpacity>
        <View style={styles.brandRow} accessibilityRole="header">
          <Image source={require('../../assets/brand/adcc-logo.jpeg')} style={styles.brandLogo} />
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>ADCC</Text>
            <Text style={styles.brandSub}>PRO</Text>
          </View>
        </View>
        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Menu')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchOpen((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Close search' : 'Search movies'}
          >
            <Ionicons name={searchOpen ? 'close' : 'search'} size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoFocus
            accessibilityLabel="Search movies"
          />
        </View>
      )}

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, activeLanguage === null && styles.filterPillActive]}
          onPress={() => setActiveLanguage(null)}
          accessibilityRole="radio"
          accessibilityState={{ selected: activeLanguage === null }}
          accessibilityLabel="All languages"
        >
          <Text style={[styles.filterText, activeLanguage === null && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {languages.map((lang) => {
          const isActive = activeLanguage === lang.code;
          return (
            <TouchableOpacity
              key={lang.id}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setActiveLanguage(lang.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Filter by ${lang.name}`}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{lang.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textFaint} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchMovies(1, true)} accessibilityRole="button" accessibilityLabel="Retry">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {featured && (
            <>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => navigation.navigate('MovieDetail', { slug: featured.slug })}
                accessibilityRole="button"
                accessibilityLabel={`Featured: ${featured.title}, ${featured.release_year}`}
              >
                <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
                  <ImageBackground
                    source={{ uri: featured.poster_url }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>{featured.title}</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.langPill}>
                    <Text style={styles.langPillText}>{featured.original_language.name.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.heroMeta}> &middot; {featured.release_year}</Text>
                </View>
              </View>

              {movies.length > 1 && (
                <View style={styles.dotsRow}>
                  {movies.map((m, i) => (
                    <View key={m.id} style={[styles.dot, i === heroIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>More Movies</Text>

          <FlatList
            data={movies}
            keyExtractor={(m) => String(m.id)}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: spacing.md }}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
            ListEmptyComponent={<Text style={styles.emptyText}>No movies match this filter.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => navigation.navigate('MovieDetail', { slug: item.slug })}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.release_year}, ${item.original_language.name}`}
              >
                <View style={styles.poster}>
                  <ImageBackground source={{ uri: item.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingText}>{item.original_language.code.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>{item.release_year}</Text>
              </TouchableOpacity>
            )}
          />

          {canLoadMore && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => fetchMovies(page + 1, false)}
              disabled={loadingMore}
              accessibilityRole="button"
              accessibilityLabel="Load more movies"
              accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
            >
              {loadingMore ? (
                <ActivityIndicator color={colors.gold} />
              ) : (
                <Text style={styles.loadMoreText}>Load More</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <ChromeFooter active="home" onChange={(key) => handleFooterNav(navigation, key)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.gold,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brandLogo: { width: 28, height: 28, borderRadius: 7 },
  brandWrap: { alignItems: 'center' },
  brand: { ...type.h1, color: colors.gold, letterSpacing: 1, fontSize: 18, lineHeight: 20 },
  brandSub: { ...type.caption, color: colors.textFaint, fontSize: 9, letterSpacing: 3, marginTop: -2 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, ...type.body, padding: 0 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { ...type.caption, color: colors.textMuted, fontWeight: '700' },
  filterTextActive: { color: colors.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  retryText: { ...type.body, color: colors.bg, fontWeight: '700' },
  scrollContent: { paddingBottom: 140 },
  hero: {
    height: 460,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroInfo: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  heroTitle: { ...type.display, color: colors.text, textAlign: 'center' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  langPill: { backgroundColor: colors.text, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langPillText: { ...type.caption, color: colors.bg, fontWeight: '800', fontSize: 10 },
  heroMeta: { ...type.body, color: colors.textMuted },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md, marginBottom: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised },
  dotActive: { backgroundColor: colors.gold, width: 18 },
  sectionTitle: { ...type.h2, color: colors.text, marginHorizontal: spacing.md, marginBottom: spacing.md },
  emptyText: { ...type.body, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl },
  card: { flex: 1 },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ratingPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: { ...type.caption, color: colors.textMuted, fontSize: 10 },
  cardTitle: { ...type.body, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  cardMeta: { ...type.caption, color: colors.textFaint, marginTop: 2 },
  loadMoreBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
  },
  loadMoreText: { ...type.body, color: colors.gold, fontWeight: '700' },
});
