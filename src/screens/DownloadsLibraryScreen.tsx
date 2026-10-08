import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import ChromeFooter from '../components/ChromeFooter';
import { handleFooterNav } from '../navigation/footerNav';
import { getDownloadRecords, removeDownloadRecord, deleteDownloadedTracks, DownloadRecord } from '../api/downloads';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Downloads'>;

function formatRuntime(seconds: number | null): string {
  if (seconds === null) return 'Runtime not listed';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DownloadsLibraryScreen({ navigation }: Props) {
  const [records, setRecords] = useState<DownloadRecord[]>([]);

  // Re-read the local registry every time this screen is focused, since
  // downloads happen on a different screen and there's no backend endpoint
  // to list them from (by design — this is entirely a client concern).
  useFocusEffect(
    useCallback(() => {
      getDownloadRecords().then(setRecords);
    }, [])
  );

  const handleRemove = async (record: DownloadRecord) => {
    // Delete the actual files first, then drop the registry entry — removing
    // only the registry record would leave the .m4a/.srt orphaned on disk.
    await deleteDownloadedTracks(record.slug, record.languageCode);
    await removeDownloadRecord(record.slug, record.languageCode);
    setRecords((prev) => prev.filter((r) => !(r.slug === record.slug && r.languageCode === record.languageCode)));
  };

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Downloads" subtitle={`${records.length} item${records.length === 1 ? '' : 's'} on this device`} />

      <FlatList
        data={records}
        keyExtractor={(item) => `${item.slug}_${item.languageCode}`}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="download-outline" size={32} color={colors.textFaint} />
            <Text style={styles.emptyText}>No downloads yet</Text>
            <Text style={styles.emptySubtext}>Downloaded AD and CC tracks will show up here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.posterUrl }} style={styles.thumb} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardLang}>{item.languageName} &middot; {formatRuntime(item.runtimeSeconds)}</Text>
              {item.adPath && (
                <View style={styles.fileRow}>
                  <Ionicons name="ear" size={12} color={colors.gold} />
                  <Text style={styles.fileText} numberOfLines={1}>{item.adPath.split('/').pop()}</Text>
                </View>
              )}
              {item.ccPath && (
                <View style={styles.fileRow}>
                  <Ionicons name="text" size={12} color={colors.gold} />
                  <Text style={styles.fileText} numberOfLines={1}>{item.ccPath.split('/').pop()}</Text>
                </View>
              )}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.playBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Player', { slug: item.slug, language: item.languageCode })}
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title}`}
              >
                <Ionicons name="play" size={16} color={colors.bg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                activeOpacity={0.8}
                onPress={() => handleRemove(item)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.title} download`}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <ChromeFooter active="downloads" onChange={(key) => handleFooterNav(navigation, key)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 140, gap: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...type.body, color: colors.textFaint, fontWeight: '600' },
  emptySubtext: { ...type.caption, color: colors.textFaint, textAlign: 'center' },
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
  thumb: { width: 56, height: 80, borderRadius: radius.sm },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { ...type.body, color: colors.text, fontWeight: '700' },
  cardLang: { ...type.caption, color: colors.textMuted, marginBottom: 4 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileText: { ...type.caption, color: colors.textFaint, fontSize: 11 },
  actions: { gap: spacing.sm },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
