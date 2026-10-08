import * as FileSystem from 'expo-file-system';
import { getMovieBySlug } from './catalog';
import type { MovieLanguageTrack } from './types';

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}adcc-downloads/`;

async function ensureDownloadDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

function extensionFromUrl(url: string, fallback: string): string {
  const clean = url.split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1] : fallback;
}

export function localTrackPath(slug: string, languageCode: string, kind: 'cc' | 'ad', ext: string): string {
  return `${DOWNLOAD_DIR}${slug}_${languageCode}_${kind}.${ext}`;
}

export async function isTrackFileDownloaded(path: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export interface DownloadedTrackPaths {
  trackId: number;
  ccPath: string | null;
  adPath: string | null;
  languageCode: string;
  runtimeSeconds: number | null;
}

interface DownloadProgressCallbacks {
  onCcProgress?: (fraction: number) => void;
  onAdProgress?: (fraction: number) => void;
}

function log(...args: unknown[]) {
  if (__DEV__) console.log('[downloads]', ...args);
}

// The core rule from the API spec: download URLs are signed and expire 30
// minutes after the movie response was generated. Never cache/reuse a link
// long-term — always re-fetch GET /movies/{slug} immediately before
// downloading, then use those fresh links right away.
export async function downloadMovieLanguageTracks(
  slug: string,
  languageCode: string,
  callbacks: DownloadProgressCallbacks = {}
): Promise<DownloadedTrackPaths> {
  await ensureDownloadDir();

  log(`re-fetching ${slug} for fresh signed URLs before downloading (${languageCode})`);
  const freshMovie = await getMovieBySlug(slug);
  const track: MovieLanguageTrack | undefined = freshMovie.languages.find(
    (l) => l.language.code === languageCode
  );
  if (!track) {
    log(`no live "${languageCode}" track on "${slug}" — available: ${freshMovie.languages.map((l) => l.language.code).join(', ') || '(none)'}`);
    throw new Error(`No live track for language "${languageCode}" on "${slug}"`);
  }
  log(`track #${track.id} found: cc=${track.downloads.cc ? 'yes' : 'no'}, ad=${track.downloads.ad ? 'yes' : 'no'}, fingerprint=${track.downloads.fingerprint ? 'yes' : 'no'}`);

  let ccPath: string | null = null;
  let adPath: string | null = null;

  if (track.downloads.cc) {
    const ext = extensionFromUrl(track.downloads.cc, 'srt');
    const dest = localTrackPath(slug, languageCode, 'cc', ext);
    log(`downloading CC from ${track.downloads.cc} → ${dest}`);
    const resumable = FileSystem.createDownloadResumable(
      track.downloads.cc,
      dest,
      {},
      (p) => callbacks.onCcProgress?.(p.totalBytesWritten / Math.max(p.totalBytesExpectedToWrite, 1))
    );
    const result = await resumable.downloadAsync();
    log(`CC download finished, status=${result?.status ?? 'unknown'}`);
    // Signed links expire 30 minutes after the movie response was generated
    // and come back as a plain 403 with no JSON body on expiry/tampering.
    // A 404 is a different failure — the path itself doesn't exist on the
    // server (missing/never-uploaded file), not an expired signature.
    // expo-file-system won't throw on a non-2xx status by itself, so check
    // it explicitly and don't leave a bad file behind.
    if (!result || (result.status !== 200 && result.status !== 206)) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      const reason = result?.status === 404 ? 'the file is missing on the server' : 'the signed link may have expired';
      throw new Error(`CC download failed (status ${result?.status ?? 'unknown'}) — ${reason}.`);
    }
    ccPath = dest;
  }

  if (track.downloads.ad) {
    const ext = extensionFromUrl(track.downloads.ad, 'm4a');
    const dest = localTrackPath(slug, languageCode, 'ad', ext);
    log(`downloading AD from ${track.downloads.ad} → ${dest}`);
    const resumable = FileSystem.createDownloadResumable(
      track.downloads.ad,
      dest,
      {},
      (p) => callbacks.onAdProgress?.(p.totalBytesWritten / Math.max(p.totalBytesExpectedToWrite, 1))
    );
    const result = await resumable.downloadAsync();
    log(`AD download finished, status=${result?.status ?? 'unknown'}`);
    if (!result || (result.status !== 200 && result.status !== 206)) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      const reason = result?.status === 404 ? 'the file is missing on the server' : 'the signed link may have expired';
      throw new Error(`AD download failed (status ${result?.status ?? 'unknown'}) — ${reason}.`);
    }
    adPath = dest;
  }

  // track.downloads.fingerprint is now populated (as of 2026-09-28) but we
  // don't need to download it — matching happens server-side via
  // POST /tracks/{id}/sync, which just needs a mic sample uploaded to it.

  log(`done: ccPath=${ccPath ?? 'none'}, adPath=${adPath ?? 'none'}`);
  return { trackId: track.id, ccPath, adPath, languageCode, runtimeSeconds: track.runtime_seconds };
}

export async function deleteDownloadedTracks(slug: string, languageCode: string): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!dirInfo.exists) return;
  const files = await FileSystem.readDirectoryAsync(DOWNLOAD_DIR);
  const prefix = `${slug}_${languageCode}_`;
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map((f) => FileSystem.deleteAsync(`${DOWNLOAD_DIR}${f}`, { idempotent: true }))
  );
}

export async function listDownloadedFiles(): Promise<string[]> {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) return [];
  return FileSystem.readDirectoryAsync(DOWNLOAD_DIR);
}

// ---- Local download registry ----
// The API has no "list what I've downloaded" endpoint (by design — that's
// entirely a client concern). We keep a small local index so screens like
// the Downloads library and Sync status can show real downloaded titles.

const REGISTRY_PATH = `${FileSystem.documentDirectory}adcc-downloads-registry.json`;

export interface DownloadRecord {
  slug: string;
  trackId: number;
  title: string;
  posterUrl: string;
  languageCode: string;
  languageName: string;
  ccPath: string | null;
  adPath: string | null;
  runtimeSeconds: number | null;
  downloadedAt: string;
}

async function readRegistry(): Promise<DownloadRecord[]> {
  const info = await FileSystem.getInfoAsync(REGISTRY_PATH);
  if (!info.exists) return [];
  try {
    const raw = await FileSystem.readAsStringAsync(REGISTRY_PATH);
    return JSON.parse(raw) as DownloadRecord[];
  } catch {
    return [];
  }
}

async function writeRegistry(records: DownloadRecord[]): Promise<void> {
  await FileSystem.writeAsStringAsync(REGISTRY_PATH, JSON.stringify(records));
}

export async function saveDownloadRecord(record: DownloadRecord): Promise<void> {
  const records = await readRegistry();
  const filtered = records.filter(
    (r) => !(r.slug === record.slug && r.languageCode === record.languageCode)
  );
  filtered.unshift(record);
  await writeRegistry(filtered);
}

export async function getDownloadRecords(): Promise<DownloadRecord[]> {
  return readRegistry();
}

export async function getDownloadRecord(
  slug: string,
  languageCode: string
): Promise<DownloadRecord | undefined> {
  const records = await readRegistry();
  return records.find((r) => r.slug === slug && r.languageCode === languageCode);
}

export async function removeDownloadRecord(slug: string, languageCode: string): Promise<void> {
  const records = await readRegistry();
  await writeRegistry(records.filter((r) => !(r.slug === slug && r.languageCode === languageCode)));
}
