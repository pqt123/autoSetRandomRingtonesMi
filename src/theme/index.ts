export const Colors = {
  // Backgrounds
  bg: '#0F0F1A',
  bgCard: '#1A1A2E',
  bgCardAlt: '#16213E',
  bgOverlay: 'rgba(15,15,26,0.9)',

  // Primary – Purple gradient
  primary: '#6C63FF',
  primaryLight: '#9D97FF',
  primaryDark: '#4A42DD',

  // Accent
  accent: '#FF6584',
  accentGreen: '#43C6AC',
  accentOrange: '#F7971E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#5A5A7A',
  textDisabled: '#3A3A5A',

  // Status
  success: '#43C6AC',
  warning: '#F7971E',
  error: '#FF6584',

  // Borders / Dividers
  border: '#2A2A3E',
  borderLight: '#3A3A5A',

  // Glassmorphism
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.1)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '500' as const, color: Colors.textMuted },
  label: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 1 },
};
