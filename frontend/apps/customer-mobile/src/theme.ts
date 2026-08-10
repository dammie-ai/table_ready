export const colors = {
  primary: '#c2410c',
  secondary: '#2563eb',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#dc2626',
  success: '#16a34a',
  disabled: '#9ca3af',
};

// Same brand primary/secondary in both modes — only the neutral
// background/surface/text/border/disabled shades flip for dark mode.
export const darkColors = {
  ...colors,
  background: '#0a0a0f',
  surface: '#16161d',
  text: '#f1f5f9',
  textSecondary: '#9ca3af',
  border: '#27272f',
  error: '#f87171',
  success: '#4ade80',
  disabled: '#4b5563',
};

// Picks black or white for guaranteed-readable text on top of an
// arbitrary background color. Needed anywhere text sits directly on
// colors.primary — that's admin-configurable from the branding panel, so
// a single hardcoded text color (white) breaks the moment someone picks
// a light primary, no matter what the "right" brand color would be.
export function contrastText(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#111827' : '#ffffff';
}

export const typography = {
  h1: { fontSize: 36, fontWeight: 'bold' as const, color: colors.text },
  h2: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  caption: { fontSize: 14, fontWeight: '500' as const, color: colors.textSecondary },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
};
