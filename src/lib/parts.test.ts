import { describe, expect, it } from 'vitest';
import { assessInventoryStatus } from './parts';

describe('Part inventory assessment', () => {
  it('returns not_found when no inventory item exists', () => {
    const result = assessInventoryStatus(null, 5);
    expect(result).toEqual({
      inventoryStatus: 'not_found',
      shouldAwaitStock: true,
    });
  });

  it('returns out_of_stock when quantity is zero', () => {
    const result = assessInventoryStatus({ quantity: 0, minQuantity: 2 }, 1);
    expect(result).toEqual({
      inventoryStatus: 'out_of_stock',
      inventoryQuantity: 0,
      inventoryMinStock: 2,
      shouldAwaitStock: true,
    });
  });

  it('returns low_stock when requested quantity exceeds available stock', () => {
    const result = assessInventoryStatus({ quantity: 5, minQuantity: 2 }, 6);
    expect(result).toEqual({
      inventoryStatus: 'low_stock',
      inventoryQuantity: 5,
      inventoryMinStock: 2,
      shouldAwaitStock: false,
    });
  });

  it('returns low_stock when stock is below minQuantity', () => {
    const result = assessInventoryStatus({ quantity: 3, minQuantity: 5 }, 1);
    expect(result).toEqual({
      inventoryStatus: 'low_stock',
      inventoryQuantity: 3,
      inventoryMinStock: 5,
      shouldAwaitStock: false,
    });
  });

  it('returns available when inventory is sufficient', () => {
    const result = assessInventoryStatus({ quantity: 10, minQuantity: 5 }, 2);
    expect(result).toEqual({
      inventoryStatus: 'available',
      inventoryQuantity: 10,
      inventoryMinStock: 5,
      shouldAwaitStock: false,
    });
  });
});
