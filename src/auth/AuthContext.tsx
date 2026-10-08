import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as authApi from '../api/auth';
import { onUnauthorized } from '../api/client';
import {
  saveSession,
  getToken,
  getRole,
  getStoredUser,
  clearSession,
  StoredUser,
} from '../api/tokenStorage';
import type { UserRole } from '../api/types';
import { navigationRef } from '../navigation/navigationRef';

interface AuthContextValue {
  loading: boolean;
  isAuthenticated: boolean;
  user: StoredUser | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<UserRole>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    (async () => {
      const [token, storedRole, storedUser] = await Promise.all([
        getToken(),
        getRole(),
        getStoredUser(),
      ]);
      setHasToken(!!token);
      setRole(storedRole);
      setUser(storedUser);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    // Tokens don't expire server-side, but can be revoked. A 401 means the
    // stored token is no longer valid — drop the local session AND move the
    // user off whatever protected screen they were on, since Home/browsing
    // is the only place that's guaranteed to work without a session.
    onUnauthorized(() => {
      clearSession();
      setUser(null);
      setRole(null);
      setHasToken(false);
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
      Alert.alert('Session ended', 'Please sign in again to continue.');
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserRole> => {
    const res = await authApi.login({ email, password });
    const storedUser: StoredUser = { id: res.user.id, name: res.user.name, email: res.user.email };
    await saveSession(res.token, storedUser, res.user.role);
    setUser(storedUser);
    setRole(res.user.role);
    setHasToken(true);
    return res.user.role;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      const res = await authApi.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      // Registration always creates role: "audience" (implied — the API
      // doesn't return it here, unlike /auth/login).
      const storedUser: StoredUser = { id: res.user.id, name: res.user.name, email: res.user.email };
      await saveSession(res.token, storedUser, 'audience');
      setUser(storedUser);
      setRole('audience');
      setHasToken(true);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the network call fails, still drop the local session.
    }
    await clearSession();
    setUser(null);
    setRole(null);
    setHasToken(false);
  }, []);

  const value: AuthContextValue = {
    loading,
    isAuthenticated: hasToken,
    user,
    role,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
