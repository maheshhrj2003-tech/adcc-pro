import { api } from './client';
import type { FavoriteMovie, MessageResponse } from './types';

// GET /favorites — auth required. Routes by numeric movie ID (not slug),
// unlike every other endpoint. Not paginated. `languages` key is omitted
// entirely (not eager-loaded) — fetch getMovieBySlug for download links.
export async function getFavorites(): Promise<FavoriteMovie[]> {
  const res = await api.get<{ data: FavoriteMovie[] }>('/favorites', true);
  return res.data;
}

// POST /favorites/{id} — idempotent, safe to call twice.
export function addFavorite(movieId: number): Promise<MessageResponse> {
  return api.post<MessageResponse>(`/favorites/${movieId}`, undefined, true);
}

// DELETE /favorites/{id} — safe to call even if not favorited.
export function removeFavorite(movieId: number): Promise<MessageResponse> {
  return api.delete<MessageResponse>(`/favorites/${movieId}`, true);
}
