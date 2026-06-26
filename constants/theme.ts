export interface ThemeColors {
  primary: string;
  accent: string;
  bg: string;
  card: string;
  border: string;
  muted: string;
}

export const COLOR_THEMES: Array<{ key: string; label: string } & ThemeColors> = [
  { key: 'insync',  label: 'InSync Brand',  primary: '#1B3A4B', accent: '#5EC4C8', bg: '#F0F7F8', card: '#ffffff', border: '#C8DEE0', muted: '#8A9BAE' },
  { key: 'purple',  label: 'Spirit Purple', primary: '#2B2030', accent: '#E8A33D', bg: '#FAF7F2', card: '#ffffff', border: '#EAE3D9', muted: '#9B8FA6' },
  { key: 'navy',    label: 'Navy & Gold',   primary: '#1A2744', accent: '#F0C040', bg: '#F4F6FA', card: '#ffffff', border: '#D8E0EE', muted: '#7A8FAE' },
  { key: 'crimson', label: 'Crimson',       primary: '#7A1020', accent: '#FFD166', bg: '#FFF8F8', card: '#ffffff', border: '#F2D8DC', muted: '#B07A80' },
  { key: 'teal',    label: 'Teal & White',  primary: '#0D5C63', accent: '#EF8C45', bg: '#F2FAFA', card: '#ffffff', border: '#C8E8E8', muted: '#7AABAF' },
  { key: 'black',   label: 'Blackout',      primary: '#111111', accent: '#FF5533', bg: '#F5F5F5', card: '#ffffff', border: '#E0E0E0', muted: '#888888' },
];

export const DEFAULT_THEME_KEY = 'insync';

export function resolveTheme(
  themeKey: string,
  customTheme?: Partial<ThemeColors>,
): ThemeColors {
  if (themeKey === 'custom' && customTheme) {
    return {
      primary: customTheme.primary ?? '#2B2030',
      accent:  customTheme.accent  ?? '#E8A33D',
      bg:      customTheme.bg      ?? '#FAFAFA',
      card:    customTheme.card    ?? '#ffffff',
      border:  customTheme.border  ?? '#E5E5E5',
      muted:   customTheme.muted   ?? '#999999',
    };
  }
  return COLOR_THEMES.find((t) => t.key === themeKey) ?? COLOR_THEMES[0];
}
