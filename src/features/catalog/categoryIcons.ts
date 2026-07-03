// Iconos disponibles para categorías. Son PNG en public/iconos-categoria.
// La columna categories.icon guarda el nombre de archivo (ej. 'taxi.png').
export const CATEGORY_ICONS = [
  'taxi.png',
  'food-and-restaurant.png',
  'carrito-de-supermercado.png',
  'taza-de-cafe.png',
  'entretenimiento.png',
  'bailando.png',
  'medidor-de-electricidad.png',
  'grifo.png',
  'wifi.png',
  'casa.png',
  'decoracion-de-la-casa.png',
  'caja-de-regalo.png',
  'boutique.png',
  'hucha.png',
  'necesitar.png',
  'kit-de-maquillaje.png',
  'lapiz-labial.png',
  'proteccion-de-la-piel.png',
  'mujer.png',
  'espiritu.png',
  'conocimiento-de-la-ia.png',
  'elipsis.png',
] as const;

// Resuelve el icono a una URI usable en <Image> (web/PWA).
// Si el icono es un emoji viejo (no termina en .png), devuelve null.
export function categoryIconUri(icon: string | null | undefined): string | null {
  if (!icon) return null;
  return icon.endsWith('.png') ? `/iconos-categoria/${icon}` : null;
}
