import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// A real, published Play Store link doesn't exist yet during testing — this
// is the one piece of real-world info this screen needs that nothing in the
// codebase can derive on its own.
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.adccpro.app';

interface Row {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
  value?: string;
}

function SettingsRow({ row }: { row: Row }) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={row.onPress}
      accessibilityRole="button"
      accessibilityLabel={row.label}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={row.icon} size={18} color={row.danger ? colors.danger : colors.gold} />
      </View>
      <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>{row.label}</Text>
      {row.value ? (
        <Text style={styles.rowValue}>{row.value}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      )}
    </TouchableOpacity>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, logout } = useAuth();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const checkForUpdates = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      if (!Updates.isEnabled) {
        Alert.alert('Updates unavailable', 'This build was not installed from the Play Store, so update checks are disabled.');
        return;
      }
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert("You're up to date", 'ADCC PRO is already on the latest version.');
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert('Update downloaded', 'Restart the app now to apply it?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert('Could not check for updates', 'Check your connection and try again.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.navigate('Home');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ADCC PRO</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || 'G').charAt(0).toUpperCase()}</Text>
          </View>
          {isAuthenticated && user ? (
            <>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </>
          ) : (
            <>
              <Text style={styles.profileName}>Guest</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel="Sign in">
                <Text style={styles.signInLink}>Sign In / Create Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <SectionLabel>General</SectionLabel>
        <View style={styles.card}>
          <SettingsRow row={{ label: 'App Version', icon: 'information-circle-outline', onPress: () => {}, value: appVersion }} />
          <View style={styles.divider} />
          {checkingUpdate ? (
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <ActivityIndicator size="small" color={colors.gold} />
              </View>
              <Text style={styles.rowLabel}>Checking…</Text>
            </View>
          ) : (
            <SettingsRow row={{ label: 'Check for Updates', icon: 'cloud-download-outline', onPress: checkForUpdates }} />
          )}
        </View>

        <SectionLabel>Support & Legal</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            row={{
              label: 'Terms & Conditions',
              icon: 'document-text-outline',
              onPress: () => navigation.navigate('Info', { section: 'terms-conditions' }),
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            row={{ label: 'FAQs', icon: 'help-circle-outline', onPress: () => navigation.navigate('Info', { section: 'faq' }) }}
          />
          <View style={styles.divider} />
          <SettingsRow
            row={{
              label: 'Tutorial',
              icon: 'play-circle-outline',
              onPress: () => navigation.navigate('Info', { section: 'how-it-works' }),
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            row={{ label: 'About Us', icon: 'globe-outline', onPress: () => navigation.navigate('Info', { section: 'about' }) }}
          />
        </View>

        <SectionLabel>System</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            row={{ label: 'Permissions', icon: 'shield-checkmark-outline', onPress: () => Linking.openSettings() }}
          />
          <View style={styles.divider} />
          <SettingsRow row={{ label: 'Storage', icon: 'folder-outline', onPress: () => navigation.navigate('Downloads') }} />
        </View>

        <SectionLabel>Account</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            row={{
              label: 'Invite a Friend',
              icon: 'share-social-outline',
              onPress: () =>
                Share.share({
                  message: `Check out ADCC PRO — synced audio description and closed captions for movies. ${PLAY_STORE_URL}`,
                }),
            }}
          />
          {isAuthenticated && (
            <>
              <View style={styles.divider} />
              <SettingsRow row={{ label: 'Logout', icon: 'log-out-outline', onPress: handleLogout, danger: true }} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...type.h2, color: colors.text },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  profileBlock: { alignItems: 'center', paddingVertical: spacing.lg, gap: 4 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gold,
    marginBottom: spacing.sm,
  },
  avatarText: { ...type.display, color: colors.bg },
  profileName: { ...type.h1, color: colors.text },
  profileEmail: { ...type.caption, color: colors.textFaint },
  signInLink: { ...type.body, color: colors.gold, fontWeight: '700', marginTop: 4 },
  sectionLabel: { ...type.label, color: colors.textFaint, marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 38 + spacing.md },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...type.body, color: colors.text, fontWeight: '600', flex: 1 },
  rowLabelDanger: { color: colors.danger },
  rowValue: { ...type.caption, color: colors.textFaint },
});
