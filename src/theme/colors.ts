export type GradientColors = readonly [string, string, ...string[]];

export const AURA_COLORS = {
  primary: '#5B7CFF',
  primaryDark: '#3F5FD6',
  accent: '#7ED0FF',
  accentSoft: 'rgba(126, 208, 255, 0.22)',
  secondary: '#A37BFF',
  secondaryDark: '#7C5CDA',
  success: '#2DD4BF',
  successSoft: 'rgba(45, 212, 191, 0.22)',
  danger: '#F87171',
  dangerDark: '#EF4444',
  glass: {
    base: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.20)',
    borderTint: 'rgba(91, 124, 255, 0.30)',
    highlight: 'rgba(255, 255, 255, 0.15)',
    overlay: 'rgba(255, 255, 255, 0.04)',
  },
  gradients: {
    primary: ['#5B7CFF', '#7ED0FF'] as GradientColors,
    secondary: ['#A37BFF', '#5B7CFF'] as GradientColors,
    subtleGlass: ['rgba(91, 124, 255, 0.24)', 'rgba(163, 123, 255, 0.12)'] as GradientColors,
    accent: ['#7ED0FF', '#A37BFF'] as GradientColors,
    danger: ['#F87171', '#EF4444'] as GradientColors,
  },
};
