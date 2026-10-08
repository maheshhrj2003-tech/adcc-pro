import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The API has no endpoint to sync these across devices (see the reference
// doc's Open Items) — this is deliberately local-only, per spec.
const STORAGE_KEY = 'adcc_accessibility_prefs';

export type CaptionSize = 'small' | 'medium' | 'large';
export type CaptionColor = 'white' | 'yellow' | 'cyan';

export interface AccessibilityPreferences {
  captionSize: CaptionSize;
  captionColor: CaptionColor;
  adEnabledByDefault: boolean;
  defaultLanguageCode: string | null;
}

const DEFAULT_PREFS: AccessibilityPreferences = {
  captionSize: 'medium',
  captionColor: 'white',
  adEnabledByDefault: true,
  defaultLanguageCode: null,
};

export const CAPTION_SIZE_PT: Record<CaptionSize, number> = {
  small: 13,
  medium: 16,
  large: 20,
};

export const CAPTION_COLOR_HEX: Record<CaptionColor, string> = {
  white: '#FFFFFF',
  yellow: '#F5D90A',
  cyan: '#6EE7F0',
};

interface PreferencesContextValue {
  loading: boolean;
  prefs: AccessibilityPreferences;
  setCaptionSize: (size: CaptionSize) => void;
  setCaptionColor: (color: CaptionColor) => void;
  setAdEnabledByDefault: (enabled: boolean) => void;
  setDefaultLanguageCode: (code: string | null) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((next: AccessibilityPreferences) => {
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setCaptionSize = useCallback(
    (captionSize: CaptionSize) => persist({ ...prefs, captionSize }),
    [prefs, persist]
  );
  const setCaptionColor = useCallback(
    (captionColor: CaptionColor) => persist({ ...prefs, captionColor }),
    [prefs, persist]
  );
  const setAdEnabledByDefault = useCallback(
    (adEnabledByDefault: boolean) => persist({ ...prefs, adEnabledByDefault }),
    [prefs, persist]
  );
  const setDefaultLanguageCode = useCallback(
    (defaultLanguageCode: string | null) => persist({ ...prefs, defaultLanguageCode }),
    [prefs, persist]
  );

  return (
    <PreferencesContext.Provider
      value={{ loading, prefs, setCaptionSize, setCaptionColor, setAdEnabledByDefault, setDefaultLanguageCode }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
