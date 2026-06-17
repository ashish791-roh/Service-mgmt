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

  it('treats empty string inputs as zero', () => {
    expect(calculatePaymentTotals('', '   ')).toEqual({
      serviceCharge: 0,
      partsCost: 0,
      totalBill: 0,
    });
  });

  it('handles negative values correctly', () => {
    expect(calculatePaymentTotals(-10, '-25.50')).toEqual({
      serviceCharge: -10,
      partsCost: -25.5,
      totalBill: -35.5,
    });
  });

  it('handles precision decimals correctly', () => {
    expect(calculatePaymentTotals(0.1, 0.2)).toEqual({
      serviceCharge: 0.1,
      partsCost: 0.2,
      totalBill: 0.30000000000000004, // standard JS float addition behavior
    });
  });

  it('handles undefined/missing arguments by falling back to zero', () => {
    expect(calculatePaymentTotals(undefined as unknown as number, undefined as unknown as number)).toEqual({
      serviceCharge: 0,
      partsCost: 0,
      totalBill: 0,
    });
  });
});
