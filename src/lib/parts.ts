export type InventoryStatus = 'available' | 'low_stock' | 'out_of_stock' | 'not_found';

export interface InventoryItem {
  quantity: number;
  minQuantity: number;
}

export interface InventoryAssessment {
  inventoryStatus: InventoryStatus;
  inventoryQuantity?: number;
  inventoryMinStock?: number;
  shouldAwaitStock: boolean;
}

export function assessInventoryStatus(
  inventoryItem: InventoryItem | null,
  requestedQuantity: number
): InventoryAssessment {
  if (!inventoryItem) {
    return {
      inventoryStatus: 'not_found',
      shouldAwaitStock: true,
    };
  }

  const { quantity, minQuantity } = inventoryItem;
  const requested = Number(requestedQuantity);

  if (quantity <= 0) {
    return {
      inventoryStatus: 'out_of_stock',
      inventoryQuantity: quantity,
      inventoryMinStock: minQuantity,
      shouldAwaitStock: true,
    };
  }

  if (quantity < requested || quantity < minQuantity) {
    return {
      inventoryStatus: 'low_stock',
      inventoryQuantity: quantity,
      inventoryMinStock: minQuantity,
      shouldAwaitStock: false,
    };
  }

  return {
    inventoryStatus: 'available',
    inventoryQuantity: quantity,
    inventoryMinStock: minQuantity,
    shouldAwaitStock: false,
  };
}
