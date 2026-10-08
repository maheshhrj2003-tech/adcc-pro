import * as SecureStore from 'expo-secure-store';
import type { UserRole } from './types';

const TOKEN_KEY = 'adcc_auth_token';
const ROLE_KEY = 'adcc_auth_role';
const USER_KEY = 'adcc_auth_user';

export interface StoredUser {
  id: number;
  name: string;
  email: string;
}

// The API never returns `role` from /me or /register — only /login does.
// We persist it at login time since it can't be re-derived later.
export async function saveSession(token: string, user: StoredUser, role: UserRole) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(ROLE_KEY, role);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRole(): Promise<UserRole | null> {
  const role = await SecureStore.getItemAsync(ROLE_KEY);
  return (role as UserRole) ?? null;
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
