import { api } from './client';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  MessageResponse,
} from './types';

// POST /auth/register — always creates role: "audience" (implied, not returned).
export function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return api.post<RegisterResponse>('/auth/register', payload);
}

// POST /auth/login — the ONLY endpoint that returns `role`.
export function login(payload: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', payload);
}

// POST /auth/logout — auth required. Invalidates the current token only.
export function logout(): Promise<MessageResponse> {
  return api.post<MessageResponse>('/auth/logout', undefined, true);
}

// GET /me — auth required. Does NOT return `role`.
export function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me', true);
}
