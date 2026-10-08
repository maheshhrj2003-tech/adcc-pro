import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { useAuth } from '../auth/AuthContext';
import { getMe } from '../api/auth';
import { MeResponse } from '../api/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { role, logout } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // GET /me — confirms the token is still valid and refreshes name/email.
    getMe()
      .then(setMe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.popToTop();
  };

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Account" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : me ? (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{me.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{me.name}</Text>
            <Text style={styles.email}>{me.email}</Text>
            {role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{role === 'screener' ? 'Screener Account' : 'Audience Account'}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.errorText}>Could not load your profile.</Text>
        )}

        {role === 'screener' && (
          <TouchableOpacity
            style={styles.rowBtn}
            onPress={() => navigation.navigate('Screenings')}
            accessibilityRole="button"
            accessibilityLabel="My Screenings"
          >
            <Ionicons name="film-outline" size={18} color={colors.gold} />
            <Text style={styles.rowBtnText}>My Screenings</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.rowBtn}
          onPress={() => navigation.navigate('Favorites')}
          accessibilityRole="button"
          accessibilityLabel="Favorites"
        >
          <Ionicons name="heart-outline" size={18} color={colors.gold} />
          <Text style={styles.rowBtnText}>Favorites</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { ...type.display, color: colors.bg },
  name: { ...type.h1, color: colors.text },
  email: { ...type.body, color: colors.textMuted },
  roleBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldDim,
  },
  roleText: { ...type.caption, color: colors.gold, fontWeight: '700' },
  errorText: { ...type.body, color: colors.textFaint, textAlign: 'center' },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowBtnText: { ...type.body, color: colors.text, fontWeight: '600', flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  logoutText: { ...type.body, color: colors.danger, fontWeight: '700' },
});
