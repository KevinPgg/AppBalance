// Iconos disponibles para categorías. Son PNG en public/iconos-categoria.
// La columna categories.icon guarda el nombre de archivo (ej. 'taxi.png').
export const CATEGORY_ICONS = [
  'taxi.png',
  'restaurante.png',
  'hamburguesa.png',
  'carrito-de-compras.png',
  'entretenimiento.png',
  'partido.png',
  'palanca-de-mando.png',
  'bailando.png',
  'entradas.png',
  'perno-de-luz.png',
  'gota-de-agua.png',
  'wifi.png',
  'telefono-movil.png',
  'casa.png',
  'decoracion-de-la-casa.png',
  'tienda-de-ropa.png',
  'corte-de-pelo.png',
  'cuidado-del-cabello.png',
  'kit-de-maquillaje.png',
  'mujer.png',
  'latido-del-corazon.png',
  'moneda.png',
  'hucha.png',
  'transferencia-de-dinero.png',
  'conocimiento-de-la-ia.png',
  'elipsis.png',
] as const;

// Resuelve el icono a una URI usable en <Image> (web/PWA).
// Si el icono es un emoji viejo (no termina en .png), devuelve null.
export function categoryIconUri(icon: string | null | undefined): string | null {
  if (!icon) return null;
  return icon.endsWith('.png') ? `/iconos-categoria/${icon}` : null;
}
