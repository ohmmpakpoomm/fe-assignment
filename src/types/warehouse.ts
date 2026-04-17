export interface WarehouseStock {
  id: string;               // Unique id just for indexing
  warehouseId: string;
  supplierId: string;
  itemId: string;
  stock: number;            // integer units remaining
  totalCapacity: number;    // integer units — original capacity for UI progress bars
}
