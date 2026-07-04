// ============================================================
// AppBalance — Sistema de temas (Café + Cherry, claro/oscuro)
// ------------------------------------------------------------
// Portado desde Estilo_design/theme.css. React Native no tiene
// variables CSS ni atributos data-*, así que cada tema es un objeto
// de tokens en JS. El store de useTheme() elige el activo en runtime.
//
// Cada tema expone DOS grupos de llaves:
//   1) Tokens canónicos del diseño (bg, surface, heroFrom, caramel…).
//   2) Alias con los MISMOS nombres que el viejo src/theme/colors.ts
//      (espresso, coffee, foam, cream, border, textPrimary…). Así,
//      migrar una pantalla es casi un reemplazo `colors.` -> `theme.`
//      sin renombrar llaves.
//
// colors.ts se deja INTACTO: las pantallas aún no migradas siguen
// usando la paleta estática (Latte) y no se rompen.
// ============================================================

export type ThemeFamily = 'cafe' | 'cherry';
export type ThemeMode = 'light' | 'dark';
export type ThemeKey = `${ThemeFamily}-${ThemeMode}`;

// Tokens crudos de cada paleta (idénticos a las variables --token del CSS).
type RawTokens = {
  desk: string;
  bg: string;
  surface: string;
  foam: string;
  espresso: string;
  espresso2: string;
  ink: string;
  muted: string;
  line: string;
  caramel: string;
  latte: string;
  pos: string;
  neg: string;
  gold: string;
  accentDeep: string;
  heroFrom: string;
  heroTo: string;
  onHero: string;
  onHeroDim: string;
  onHeroWarm: string;
  onHeroGreen: string;
  onAccent: string;
};

// ---- CAFÉ · Latte (claro) ----
const cafeLight: RawTokens = {
  desk: '#DBCFBB', bg: '#EFE7DA', surface: '#FBF7F0', foam: '#F5ECDD',
  espresso: '#3A2C24', espresso2: '#4C3A2F', ink: '#2A1F19', muted: '#8C7C6E',
  line: '#E5DACA', caramel: '#B07A44', latte: '#C9A57A', pos: '#6E8B5B',
  neg: '#B5654A', gold: '#C8974A', accentDeep: '#8C5A2E',
  heroFrom: '#5A4535', heroTo: '#33261E',
  onHero: '#F6ECDD', onHeroDim: '#D9C3A8', onHeroWarm: '#EBC79E', onHeroGreen: '#B7CDA2',
  onAccent: '#F3E6D2',
};

// ---- CAFÉ · Espresso (oscuro) ----
const cafeDark: RawTokens = {
  desk: '#140E09', bg: '#1D1611', surface: '#28201A', foam: '#322820',
  espresso: '#0F0B08', espresso2: '#2A1F17', ink: '#F1E7DA', muted: '#A8978A',
  line: '#3A2E26', caramel: '#D69B5F', latte: '#C9A57A', pos: '#8FB176',
  neg: '#DA8B6F', gold: '#DDB264', accentDeep: '#A9682F',
  heroFrom: '#3A2A20', heroTo: '#150E09',
  onHero: '#F6ECDD', onHeroDim: '#C9B79E', onHeroWarm: '#E9C08F', onHeroGreen: '#A9C08F',
  onAccent: '#F3E6D2',
};

// ---- CHERRY · Cherry (claro) ----
const cherryLight: RawTokens = {
  desk: '#F0CDD6', bg: '#FDEDF1', surface: '#FFF7F9', foam: '#FBDEE6',
  espresso: '#B0284A', espresso2: '#C6395C', ink: '#3E1420', muted: '#B07A88',
  line: '#F6D4DD', caramel: '#D94E72', latte: '#EE9CB4', pos: '#5FA06E',
  neg: '#C0304F', gold: '#E86A8C', accentDeep: '#8E1F3D',
  heroFrom: '#C23256', heroTo: '#7C1734',
  onHero: '#FFEAF0', onHeroDim: '#F4C4D2', onHeroWarm: '#F8B6C8', onHeroGreen: '#BFE0C4',
  onAccent: '#FFEAF0',
};

// ---- CHERRY · Dark Cherry (oscuro) ----
const cherryDark: RawTokens = {
  desk: '#17080D', bg: '#240B13', surface: '#33121C', foam: '#3F1826',
  espresso: '#5C1228', espresso2: '#712038', ink: '#F6DBE3', muted: '#C093A0',
  line: '#4A2230', caramel: '#E86A8C', latte: '#EE9CB4', pos: '#8FB183',
  neg: '#E8899E', gold: '#E86A8C', accentDeep: '#B23A5B',
  heroFrom: '#6E1730', heroTo: '#2A0A14',
  onHero: '#FFEAF0', onHeroDim: '#E7B9C8', onHeroWarm: '#F1A8BE', onHeroGreen: '#A9C08F',
  onAccent: '#FFEAF0',
};

// Construye el objeto de tema final: tokens del diseño + alias con las
// llaves que hoy usan las pantallas (para migración mecánica).
function buildTheme(t: RawTokens) {
  return {
    // --- Tokens canónicos del diseño (para componentes nuevos) ---
    desk: t.desk,
    bg: t.bg,
    surface: t.surface,
    foamToken: t.foam, // fill de tracks/segmentos (más oscuro que surface)
    espresso2: t.espresso2,
    ink: t.ink,
    muted: t.muted,
    line: t.line,
    caramel: t.caramel,
    pos: t.pos,
    neg: t.neg,
    gold: t.gold,
    accentDeep: t.accentDeep,
    heroFrom: t.heroFrom,
    heroTo: t.heroTo,
    onHero: t.onHero,
    onHeroDim: t.onHeroDim,
    onHeroWarm: t.onHeroWarm,
    onHeroGreen: t.onHeroGreen,
    onAccent: t.onAccent,

    // --- Alias compatibles con el viejo colors.ts ---
    // (mismos nombres de llave, mapeados al token equivalente por tema)
    espresso: t.espresso,     // texto/superficie oscura de marca
    coffee: t.espresso2,      // botones/acentos fuertes (era #5E3B30 en Latte)
    mocha: t.caramel,         // acento secundario / iconos
    latte: t.latte,           // resaltados
    sage: t.muted,            // texto secundario / bordes suaves
    cream: t.bg,              // fondo de pantalla
    foam: t.surface,          // fondo de tarjetas/inputs/chips
    success: t.pos,           // pagado / dentro de presupuesto
    warning: t.gold,          // en riesgo / atrasado leve
    danger: t.neg,            // sobre presupuesto / vencido
    textPrimary: t.ink,
    textSecondary: t.muted,
    textOnDark: t.onAccent,
    border: t.line,
  } as const;
}

export type Theme = ReturnType<typeof buildTheme>;

export const THEMES: Record<ThemeKey, Theme> = {
  'cafe-light': buildTheme(cafeLight),
  'cafe-dark': buildTheme(cafeDark),
  'cherry-light': buildTheme(cherryLight),
  'cherry-dark': buildTheme(cherryDark),
};

export const DEFAULT_FAMILY: ThemeFamily = 'cafe';
export const DEFAULT_MODE: ThemeMode = 'light';

export function themeKey(family: ThemeFamily, mode: ThemeMode): ThemeKey {
  return `${family}-${mode}`;
}

// Nombres visibles según la familia (igual que LABELS en theme.js).
export const THEME_LABELS: Record<ThemeFamily, Record<ThemeMode, string>> = {
  cafe: { light: 'Latte', dark: 'Espresso' },
  cherry: { light: 'Cherry', dark: 'Dark Cherry' },
};

// Swatches para el selector de paleta en Ajustes (3 muestras por familia).
export const FAMILY_SWATCHES: Record<ThemeFamily, [string, string, string]> = {
  cafe: [cafeLight.espresso, cafeLight.surface, cafeLight.caramel],
  cherry: [cherryLight.espresso, cherryLight.surface, cherryLight.caramel],
};
