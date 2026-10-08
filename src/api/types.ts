// Types mirror the ADCC Cinema Mobile App API Reference exactly.
// Base URL (production): https://admin.adccpro.com/api/v1

export interface ApiLanguage {
  id: number;
  code: string;
  name: string;
}

export interface ApiLanguageRef {
  code: string;
  name: string;
}

export interface TrackDownloads {
  cc: string | null;
  ad: string | null;
  fingerprint: string | null;
}

export interface MovieLanguageTrack {
  // Confirmed live on the real API (2026-09-28) — this is the numeric track
  // ID used for /tracks/{id}/download/* and /tracks/{id}/sync.
  id: number;
  language: ApiLanguageRef;
  // The doc's example always shows a number, but a live track with only a
  // CC file (no AD) has been observed returning null here — handle both.
  runtime_seconds: number | null;
  downloads: TrackDownloads;
}

// ---- Mic-based auto-sync (POST /tracks/{id}/sync) ----
// Confirmed live and verified directly against the backend on 2026-09-28.
// Not in the original API reference doc — added later; fingerprinting is
// now Chromaprint-based and fully server-side (no matching library needed
// on the app side, just record + upload the sample).

export interface SyncMatchResult {
  matched: true;
  offset_seconds: number;
  confidence: number;
  significance: number;
}

export interface SyncNoMatchResult {
  matched: false;
  offset_seconds: number;
  confidence: number;
  significance: number;
}

export type SyncResult = SyncMatchResult | SyncNoMatchResult;

// The 422 "no fingerprint yet" / "could not process" shape.
export interface SyncUnavailableBody {
  matched: false;
  message: string;
}

export interface ApiMovie {
  id: number;
  slug: string;
  title: string;
  synopsis: string | null;
  poster_url: string;
  release_year: number;
  original_language: ApiLanguageRef;
  languages: MovieLanguageTrack[];
}

// GET /favorites returns movies WITHOUT the `languages` key at all.
export type FavoriteMovie = Omit<ApiMovie, 'languages'>;

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  [key: string]: unknown;
}

export interface PaginatedMovies {
  data: ApiMovie[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

export interface MovieDetailResponse {
  data: ApiMovie;
}

// ---- Auth ----

export type UserRole = 'audience' | 'screener';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role?: UserRole; // only present on /auth/login per spec
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterResponse {
  user: { id: number; name: string; email: string };
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: { id: number; name: string; email: string; role: UserRole };
  token: string;
}

export interface MeResponse {
  id: number;
  name: string;
  email: string;
}

export interface MessageResponse {
  message: string;
}

// ---- Screenings ----

export interface ScreeningListItem {
  // Observed null in practice on placeholder/test titles — unlike published
  // movies, a screening's poster isn't guaranteed to be set yet.
  movie: { id: number; slug: string; title: string; poster_url: string | null };
  granted_at: string;
  first_watched_at: string | null;
  last_watched_at: string | null;
}

export interface ScreeningDetail {
  id: number;
  slug: string;
  title: string;
  synopsis: string | null;
  poster_url: string | null;
  languages: MovieLanguageTrack[];
  screening: {
    first_watched_at: string | null;
    last_watched_at: string | null;
  };
}

export interface ReviewRequest {
  rating?: number;
  comment: string;
}

// ---- Errors ----

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
