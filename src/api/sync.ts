import * as FileSystem from 'expo-file-system';
import { BASE_URL } from './client';
import { ApiError, SyncResult, SyncUnavailableBody } from './types';

function log(...args: unknown[]) {
  if (__DEV__) console.log('[sync]', ...args);
}

// POST /tracks/{id}/sync — confirmed live 2026-09-28, not in the original
// API reference doc (added after it was written). Chromaprint-based
// fingerprint matching, fully server-side: upload a mic sample, get back
// where in the film that sample matched.
//
// Uses FileSystem.uploadAsync with real multipart, NOT fetch()+FormData —
// a manual FormData with a {uri,name,type} object has been observed to
// throw "Unsupported FormData part implementation" on-device before the
// request even leaves the phone (the request never reaches the server in
// that case). uploadAsync talks to native networking directly and doesn't
// have this problem.
export async function syncTrack(trackId: number, sampleUri: string): Promise<SyncResult> {
  const url = `${BASE_URL}/tracks/${trackId}/sync`;
  log(`uploading sample for track #${trackId} from`, sampleUri);

  const result = await FileSystem.uploadAsync(url, sampleUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'sample',
    mimeType: 'audio/m4a',
    headers: { Accept: 'application/json' },
  });

  log(`response status=${result.status}`, result.body);

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    throw new Error(`Sync request returned a non-JSON response (status ${result.status}).`);
  }

  if (result.status === 200) {
    return parsed as SyncResult;
  }

  if (result.status === 422) {
    const body = parsed as SyncUnavailableBody & { errors?: Record<string, string[]> };
    const message = body.message || 'Could not process the recording — please try again.';
    throw new ApiError(422, body, message);
  }

  throw new ApiError(result.status, parsed as never, `Sync request failed with status ${result.status}.`);
}
