export type ThemeMode = 'light' | 'dark';

const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

const spacing = (n: number) => n * 4;

const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

const shadowsLight = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

export const darkTheme = {
  mode: 'dark' as ThemeMode,
  colors: {
    background: '#0B0F14',
    surface: '#121826',
    surfaceElevated: '#1A2230',
    border: '#2A3344',
    text: '#E8EDF4',
    textMuted: '#8B96A8',
    primary: '#3B82F6',
    primaryMuted: '#1E3A5F',
    success: '#22C55E',
    warning: '#EAB308',
    danger: '#EF4444',
    chartLine: '#60A5FA',
    chartBar1: '#22C55E',
    chartBar2: '#F97316',
    overlay: 'rgba(0,0,0,0.55)',
    chartBgFrom: '#1A2230',
    chartBgTo: '#121826',
    chartLabel: '#C7D2FE',
    chartGrid: '#2A3344',
    iconLogout: '#FCA5A5',
    fabIcon: '#FFFFFF',
  },
  radii,
  spacing,
  shadows,
} as const;

export const lightTheme = {
  mode: 'light' as ThemeMode,
  colors: {
    background: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    primary: '#2563EB',
    primaryMuted: '#DBEAFE',
    success: '#16A34A',
    warning: '#CA8A04',
    danger: '#DC2626',
    chartLine: '#2563EB',
    chartBar1: '#16A34A',
    chartBar2: '#EA580C',
    overlay: 'rgba(15,23,42,0.45)',
    chartBgFrom: '#FFFFFF',
    chartBgTo: '#E2E8F0',
    chartLabel: '#475569',
    chartGrid: '#CBD5E1',
    iconLogout: '#DC2626',
    fabIcon: '#FFFFFF',
  },
  radii,
  spacing,
  shadows: shadowsLight,
} as const;

export type AppTheme = typeof darkTheme;
