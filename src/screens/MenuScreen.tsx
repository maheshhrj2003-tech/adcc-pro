import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: (nav: Props['navigation']) => void;
}

function buildNavItems(isAuthenticated: boolean, isScreener: boolean, userName: string | null): NavItem[] {
  const items: NavItem[] = [];

  // Screener accounts get a distinct, isolated flow — regular audience UI
  // (full catalog browse, favorites, personal downloads) doesn't apply to
  // them, per the API reference's screener-mode requirement.
  if (isScreener) {
    items.push(
      {
        label: userName ? `Account (${userName})` : 'Account',
        icon: 'person-circle-outline',
        action: (nav) => nav.navigate('Profile'),
      },
      { label: 'My Screenings', icon: 'eye-outline', action: (nav) => nav.navigate('Screenings') }
    );
  } else {
    items.push({ label: 'Movies', icon: 'film-outline', action: (nav) => nav.navigate('Home') });

    if (isAuthenticated) {
      items.push({
        label: userName ? `Account (${userName})` : 'Account',
        icon: 'person-circle-outline',
        action: (nav) => nav.navigate('Profile'),
      });
      items.push({ label: 'Favorites', icon: 'heart-outline', action: (nav) => nav.navigate('Favorites') });
    } else {
      items.push({ label: 'Sign In', icon: 'log-in-outline', action: (nav) => nav.navigate('Login') });
      items.push({ label: 'Create Account', icon: 'person-add-outline', action: (nav) => nav.navigate('Register') });
    }

    items.push({ label: 'Downloads', icon: 'download-outline', action: (nav) => nav.navigate('Downloads') });
  }

  items.push(
    { label: 'Accessibility Settings', icon: 'settings-outline', action: (nav) => nav.navigate('AccessibilitySettings') },
    { label: 'About', icon: 'information-circle-outline', action: (nav) => nav.navigate('Info', { section: 'about' }) },
    { label: 'How It Works', icon: 'list-outline', action: (nav) => nav.navigate('Info', { section: 'how-it-works' }) },
    { label: 'Features', icon: 'sparkles-outline', action: (nav) => nav.navigate('Info', { section: 'features' }) },
    { label: 'Mission', icon: 'flag-outline', action: (nav) => nav.navigate('Info', { section: 'mission' }) },
    { label: 'FAQ', icon: 'help-circle-outline', action: (nav) => nav.navigate('Info', { section: 'faq' }) },
    { label: 'Contact', icon: 'mail-outline', action: (nav) => nav.navigate('Info', { section: 'contact' }) },
    { label: 'Terms of Use', icon: 'document-text-outline', action: (nav) => nav.navigate('Info', { section: 'terms-of-use' }) },
    { label: 'Terms & Conditions', icon: 'reader-outline', action: (nav) => nav.navigate('Info', { section: 'terms-conditions' }) },
    { label: 'Privacy Policy', icon: 'shield-checkmark-outline', action: (nav) => nav.navigate('Info', { section: 'privacy-policy' }) }
  );

  return items;
}

export default function MenuScreen({ navigation }: Props) {
  const { isAuthenticated, role, user } = useAuth();
  const items = buildNavItems(isAuthenticated, role === 'screener', user?.name ?? null);

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Menu" subtitle="ADCC PRO" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => item.action(navigation)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={19} color={colors.gold} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...type.body, color: colors.text, fontWeight: '600', flex: 1 },
});
