import { api } from './client';
import type { ApiLanguage, PaginatedMovies, MovieDetailResponse, ApiMovie } from './types';

// GET /languages
export function getLanguages(): Promise<ApiLanguage[]> {
  return api.get<ApiLanguage[]>('/languages');
}

export interface GetMoviesParams {
  language?: string;
  search?: string;
  page?: number;
}

// GET /movies — public, paginated, only published movies with a live track.
export function getMovies(params: GetMoviesParams = {}): Promise<PaginatedMovies> {
  const query = new URLSearchParams();
  if (params.language) query.set('language', params.language);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  const qs = query.toString();
  return api.get<PaginatedMovies>(`/movies${qs ? `?${qs}` : ''}`);
}

// GET /movies/{slug} — 404 if unpublished / no live tracks; treat as not-found.
export async function getMovieBySlug(slug: string): Promise<ApiMovie> {
  const res = await api.get<MovieDetailResponse>(`/movies/${encodeURIComponent(slug)}`);
  return res.data;
}
