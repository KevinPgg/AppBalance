// Todo el dinero se maneja en centavos (enteros) para evitar errores de float.

export function formatMoney(cents: number, currency = 'USD'): string {
  const value = cents / 100;
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

// 1250 centavos -> "12.50" (para prellenar campos de edición)
export function centsToText(cents: number): string {
  return (cents / 100).toFixed(2);
}

// "12.50" -> 1250 centavos
export function parseToCents(input: string): number {
  const normalized = input.replace(/[^0-9.,-]/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
