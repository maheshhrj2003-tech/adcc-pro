import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import {
  usePreferences,
  CaptionSize,
  CaptionColor,
  CAPTION_SIZE_PT,
  CAPTION_COLOR_HEX,
} from '../preferences/PreferencesContext';
import { getLanguages } from '../api/catalog';
import { ApiLanguage } from '../api/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AccessibilitySettings'>;

const SIZE_OPTIONS: { value: CaptionSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const COLOR_OPTIONS: { value: CaptionColor; label: string }[] = [
  { value: 'white', label: 'White' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'cyan', label: 'Cyan' },
];

export default function AccessibilitySettingsScreen({ navigation }: Props) {
  const { prefs, setCaptionSize, setCaptionColor, setAdEnabledByDefault, setDefaultLanguageCode } = usePreferences();
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);

  useEffect(() => {
    getLanguages()
      .then(setLanguages)
      .catch(() => {});
  }, []);

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Accessibility Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>CAPTION SIZE</Text>
        <View style={styles.pillRow}>
          {SIZE_OPTIONS.map((opt) => {
            const active = prefs.captionSize === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setCaptionSize(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Caption size ${opt.label}`}
              >
                <Text style={[styles.pillText, { fontSize: CAPTION_SIZE_PT[opt.value] }, active && styles.pillTextActive]}>
                  Aa
                </Text>
                <Text style={[styles.pillCaption, active && styles.pillTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>CAPTION COLOR</Text>
        <View style={styles.pillRow}>
          {COLOR_OPTIONS.map((opt) => {
            const active = prefs.captionColor === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setCaptionColor(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Caption color ${opt.label}`}
              >
                <View style={[styles.swatch, { backgroundColor: CAPTION_COLOR_HEX[opt.value] }]} />
                <Text style={[styles.pillCaption, active && styles.pillTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>AUDIO DESCRIPTION</Text>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setAdEnabledByDefault(!prefs.adEnabledByDefault)}
          accessibilityRole="switch"
          accessibilityState={{ checked: prefs.adEnabledByDefault }}
          accessibilityLabel="Enable audio description by default"
        >
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>On by default</Text>
            <Text style={styles.toggleSubtitle}>Automatically select the AD track when available for a title.</Text>
          </View>
          <View style={[styles.toggle, prefs.adEnabledByDefault && styles.toggleOn]}>
            <View style={[styles.toggleKnob, prefs.adEnabledByDefault && styles.toggleKnobOn]} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>DEFAULT LANGUAGE</Text>
        <View style={styles.langWrap}>
          <TouchableOpacity
            style={[styles.langPill, prefs.defaultLanguageCode === null && styles.langPillActive]}
            onPress={() => setDefaultLanguageCode(null)}
            accessibilityRole="radio"
            accessibilityState={{ selected: prefs.defaultLanguageCode === null }}
            accessibilityLabel="No default language"
          >
            <Text style={[styles.langText, prefs.defaultLanguageCode === null && styles.langTextActive]}>None</Text>
          </TouchableOpacity>
          {languages.map((lang) => {
            const active = prefs.defaultLanguageCode === lang.code;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.langPill, active && styles.langPillActive]}
                onPress={() => setDefaultLanguageCode(lang.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Default language ${lang.name}`}
              >
                <Text style={[styles.langText, active && styles.langTextActive]}>{lang.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.previewCard}>
          <Ionicons name="eye-outline" size={16} color={colors.gold} />
          <Text
            style={[
              styles.previewText,
              { fontSize: CAPTION_SIZE_PT[prefs.captionSize], color: CAPTION_COLOR_HEX[prefs.captionColor] },
            ]}
          >
            Caption preview text
          </Text>
        </View>

        <Text style={styles.footnote}>
          {'These settings are stored on this device only — there is no account-level sync for them yet.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...type.label, color: colors.gold, marginTop: spacing.lg, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  pillText: { color: colors.text, fontWeight: '700' },
  pillCaption: { ...type.caption, color: colors.textMuted },
  pillTextActive: { color: colors.gold },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { ...type.body, color: colors.text, fontWeight: '700' },
  toggleSubtitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.goldDim, borderColor: colors.gold },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textFaint },
  toggleKnobOn: { backgroundColor: colors.goldBright, transform: [{ translateX: 18 }] },
  langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  langPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langPillActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  langText: { ...type.body, color: colors.textMuted, fontWeight: '600' },
  langTextActive: { color: colors.gold },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewText: { fontWeight: '600' },
  footnote: { ...type.caption, color: colors.textFaint, marginTop: spacing.lg, lineHeight: 18 },
});
