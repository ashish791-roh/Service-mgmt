export interface PaymentTotals {
  serviceCharge: number;
  partsCost: number;
  totalBill: number;
}

export function calculatePaymentTotals(
  serviceCharge: number | string,
  partsCost: number | string
): PaymentTotals {
  const normalizedServiceCharge = Number(serviceCharge) || 0;
  const normalizedPartsCost = Number(partsCost) || 0;

  return {
    serviceCharge: normalizedServiceCharge,
    partsCost: normalizedPartsCost,
    totalBill: normalizedServiceCharge + normalizedPartsCost,
  };
}
