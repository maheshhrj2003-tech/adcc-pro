import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import ChromeFooter from '../components/ChromeFooter';
import { handleFooterNav } from '../navigation/footerNav';
import { getDownloadRecord, DownloadRecord } from '../api/downloads';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Sync'>;

export default function SyncStatusScreen({ route, navigation }: Props) {
  const { slug, language } = route.params;
  const [record, setRecord] = useState<DownloadRecord | null | undefined>(undefined);

  useEffect(() => {
    getDownloadRecord(slug, language).then((r) => setRecord(r ?? null));
  }, [slug, language]);

  if (record === undefined) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const hasAd = !!record?.adPath;
  const hasCc = !!record?.ccPath;

  return (
    <View style={styles.screen}>
      <ChromeHeader
        title="Sync Status"
        subtitle={record ? `${record.title} · ${record.languageName}` : 'Not downloaded'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!record ? (
          <View style={styles.masterCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.textFaint} />
            <Text style={styles.masterTitle}>Nothing downloaded yet</Text>
            <Text style={styles.masterSubtitle}>Download a title's tracks first to see sync status here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.masterCard}>
              <View style={[styles.masterIconRing, { backgroundColor: hasAd ? colors.success : colors.surfaceRaised }]}>
                <Ionicons name={hasAd ? 'checkmark' : 'time-outline'} size={26} color={hasAd ? colors.bg : colors.textFaint} />
              </View>
              <Text style={styles.masterTitle}>{hasAd ? 'Audio-locked sync' : 'Manual-clock sync'}</Text>
              <Text style={styles.masterSubtitle}>
                {hasAd
                  ? 'Captions are timed directly against the downloaded AD audio’s real playback position — there is no drift to correct because both tracks share one clock.'
                  : 'This language has no AD audio track, so captions run on an on-screen clock you start and pace yourself.'}
              </Text>
            </View>

            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemLabel}>Closed Captions</Text>
                <View style={[styles.statusPill, !hasCc && styles.statusPillOff]}>
                  <View style={[styles.statusDot, { backgroundColor: hasCc ? colors.success : colors.textFaint }]} />
                  <Text style={[styles.statusText, !hasCc && styles.statusTextOff]}>{hasCc ? 'Downloaded' : 'Not downloaded'}</Text>
                </View>
              </View>
              <Text style={styles.itemFile} numberOfLines={1}>{record.ccPath ? record.ccPath.split('/').pop() : '—'}</Text>
            </View>

            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemLabel}>Audio Description</Text>
                <View style={[styles.statusPill, !hasAd && styles.statusPillOff]}>
                  <View style={[styles.statusDot, { backgroundColor: hasAd ? colors.success : colors.textFaint }]} />
                  <Text style={[styles.statusText, !hasAd && styles.statusTextOff]}>{hasAd ? 'Downloaded' : 'Not downloaded'}</Text>
                </View>
              </View>
              <Text style={styles.itemFile} numberOfLines={1}>{record.adPath ? record.adPath.split('/').pop() : '—'}</Text>
            </View>
          </>
        )}

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>How sync works today</Text>
          <View style={styles.legendRow}>
            <Ionicons name="pulse" size={14} color={colors.gold} />
            <Text style={styles.legendText}>
              {"When an AD audio track is downloaded, captions are driven directly by that audio's real " +
                "playback position — they can't drift because they read the same clock. Microphone-based " +
                "sync to an external theater or disc feed is a separate engine the API doesn't provide yet " +
                "(it depends on a fingerprint format that hasn't been built), so titles without an AD track " +
                'fall back to a manual on-screen clock you start yourself.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ChromeFooter active="sync" onChange={(key) => handleFooterNav(navigation, key, { slug, language })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 140, gap: spacing.md },
  masterCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  masterIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  masterTitle: { ...type.h1, color: colors.text, textAlign: 'center' },
  masterSubtitle: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  itemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { ...type.h2, color: colors.text },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillOff: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...type.caption, color: colors.success, fontWeight: '700' },
  statusTextOff: { color: colors.textFaint },
  itemFile: { ...type.caption, color: colors.textFaint, marginTop: 4 },
  legendCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  legendTitle: { ...type.label, color: colors.gold, marginBottom: spacing.sm },
  legendRow: { flexDirection: 'row', gap: spacing.sm },
  legendText: { ...type.caption, color: colors.textMuted, flex: 1, lineHeight: 18 },
});
