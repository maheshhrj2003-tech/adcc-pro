import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

// The app's launch screen — sign in / create account / skip, matching the
// usual pattern for most apps instead of burying auth in a menu. Browsing
// without an account stays fully supported: Skip goes straight to Home.
export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { loading, isAuthenticated } = useAuth();

  // A session was restored from a previous launch — this screen is only for
  // signed-out users, so hand off to Home as soon as we know that's the case.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  }, [loading, isAuthenticated]);

  const enterHome = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  const showActions = !loading && !isAuthenticated;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.centerFill}>
        <Image source={require('../../assets/brand/adcc-logo.jpeg')} style={styles.logo} />
        <Text style={styles.brand}>ADCC PRO</Text>
        <Text style={styles.tagline}>Synced audio description & captions for the movies you love.</Text>
        {!showActions && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />}
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            <Text style={styles.primaryText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.secondaryText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={enterHome} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip and browse without an account">
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logo: { width: 84, height: 84, borderRadius: 20, marginBottom: spacing.md },
  brand: { ...type.display, color: colors.text, letterSpacing: 1 },
  tagline: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  actions: { gap: spacing.sm },
  primaryBtn: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: radius.pill, alignItems: 'center' },
  primaryText: { ...type.h2, color: '#FFFFFF' },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { ...type.h2, color: colors.text },
  skipText: { ...type.body, color: colors.textFaint, textAlign: 'center', marginTop: spacing.sm, fontWeight: '600' },
});
