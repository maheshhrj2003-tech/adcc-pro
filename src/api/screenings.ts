import { api } from './client';
import type { ScreeningListItem, ScreeningDetail, ReviewRequest, MessageResponse } from './types';

// GET /screenings — auth required (role: "screener"). Titles this account
// has been granted access to.
export function getScreenings(): Promise<ScreeningListItem[]> {
  return api.get<ScreeningListItem[]>('/screenings', true);
}

// GET /screenings/{slug} — includes tracks not yet live (draft/in_review/approved).
// 403 (not 404) if this account has no invitation for the title.
export function getScreeningBySlug(slug: string): Promise<ScreeningDetail> {
  return api.get<ScreeningDetail>(`/screenings/${encodeURIComponent(slug)}`, true);
}

// POST /screenings/{slug}/watched — call when the screener opens/starts a
// track. Updates first/last watched timestamps; fires an admin notification
// on first watch only.
export function markScreeningWatched(slug: string): Promise<MessageResponse> {
  return api.post<MessageResponse>(`/screenings/${encodeURIComponent(slug)}/watched`, undefined, true);
}

// POST /screenings/{slug}/review — rating optional (1-5), comment required.
// Fires an admin notification every time. 422 if comment missing or rating
// out of range.
export function submitScreeningReview(slug: string, payload: ReviewRequest): Promise<MessageResponse> {
  return api.post<MessageResponse>(`/screenings/${encodeURIComponent(slug)}/review`, payload, true);
}
