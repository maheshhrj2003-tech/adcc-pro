// Re-themed to match the ADX reference app's red/black/green palette.
// Token NAMES kept as "gold*" deliberately — every screen in the app
// already references colors.gold/goldBright/goldDim, so changing just the
// values here re-skins the whole app to red without touching every file.
export const colors = {
  bg: '#000000',
  surface: '#0E0E0E',
  surfaceRaised: '#171717',
  border: '#262626',
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  textFaint: '#6B6B6B',
  gold: '#E6332B',
  goldBright: '#FF6259',
  goldDim: '#7A1F1A',
  success: '#22C55E',
  danger: '#F87171',
};

export const gradients = {
  gold: [colors.goldDim, colors.gold, colors.goldBright] as const,
  goldHeader: ['#9E201A', '#E6332B', '#9E201A'] as const,
  overlay: ['transparent', 'rgba(0,0,0,0.95)'] as const,
  poster: ['transparent', 'rgba(0,0,0,0.9)'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const type = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: 0.2 },
  h1: { fontSize: 22, fontWeight: '700' as const },
  h2: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};
