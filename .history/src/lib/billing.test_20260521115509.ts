import { describe, expect, it } from 'vitest';
import { calculatePaymentTotals } from './billing';

describe('Billing helper', () => {
  it('correctly sums service and parts costs', () => {
    expect(calculatePaymentTotals(25, 75)).toEqual({
      serviceCharge: 25,
      partsCost: 75,
      totalBill: 100,
    });
  });

  it('normalizes string inputs into numbers', () => {
    expect(calculatePaymentTotals('12.50', '37.00')).toEqual({
      serviceCharge: 12.5,
      partsCost: 37,
      totalBill: 49.5,
    });
  });

  it('treats invalid numeric inputs as zero', () => {
    expect(calculatePaymentTotals('abc', null as unknown as string)).toEqual({
      serviceCharge: 0,
      partsCost: 0,
      totalBill: 0,
    });
  });
});
