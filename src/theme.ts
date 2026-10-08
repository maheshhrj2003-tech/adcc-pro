export const colors = {
  bg: '#000000',
  surface: '#0E0E0E',
  surfaceRaised: '#171717',
  border: '#262626',
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  textFaint: '#6B6B6B',
  gold: '#D4AF37',
  goldBright: '#F2D879',
  goldDim: '#8A6E1F',
  success: '#4ADE80',
  danger: '#F87171',
};

export const gradients = {
  gold: [colors.goldDim, colors.gold, colors.goldBright] as const,
  goldHeader: ['#B8912C', '#D4AF37', '#B8912C'] as const,
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
