// Paleta café (de la imagen de referencia). Modo claro cálido.
export const colors = {
  espresso: '#3B2A24',
  coffee: '#5E3B30',
  mocha: '#9B6A50',
  latte: '#C9A57E',
  sage: '#A9A491',
  cream: '#EFE7DC',
  foam: '#FBF7F1',
  success: '#6B8F71',
  warning: '#C98A4B',
  danger: '#A14B3C',
  // texto
  textPrimary: '#3B2A24',
  textSecondary: '#7A6E64',
  textOnDark: '#FBF7F1',
  border: '#E2D7C8',
} as const;

export type ColorName = keyof typeof colors;
