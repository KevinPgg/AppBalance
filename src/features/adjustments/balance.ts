// Validación de cuadre del desglose de un consumo.
// Regla: subtotal + impuestos + recargos − descuentos = total.
// Si no cuadra, NO se permite guardar (refleja el trigger de la BD).

export type AdjustmentKind = 'tax' | 'surcharge' | 'discount';

export type Adjustment = {
  kind: AdjustmentKind;
  amount_cents: number; // siempre positivo; el signo lo da kind
};

export function adjustmentsNet(adjustments: Adjustment[]): number {
  return adjustments.reduce((acc, a) => {
    return acc + (a.kind === 'discount' ? -a.amount_cents : a.amount_cents);
  }, 0);
}

export type BalanceCheck = {
  ok: boolean;
  expectedTotal: number; // subtotal + ajustes
  diff: number; // total - expectedTotal (0 = cuadra)
};

export function checkBalance(
  subtotalCents: number,
  totalCents: number,
  adjustments: Adjustment[],
): BalanceCheck {
  const expectedTotal = subtotalCents + adjustmentsNet(adjustments);
  const diff = totalCents - expectedTotal;
  return { ok: diff === 0, expectedTotal, diff };
}
