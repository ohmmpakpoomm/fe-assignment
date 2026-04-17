import type { OrderType } from '../constraints/orderType';

export interface SubOrder {
  subOrderId: string;       // e.g. ORDER-0001-001
  itemId: string;           // e.g. Item-1
  warehouseId: string;      // WH-001 | WH-000 (any)
  supplierId: string;       // SP-001 | SP-000 (any)
  requestQty: number;
  type: OrderType;
  createDate: string;       // ISO date
  remark?: string;
  allocated: number;        // mutable - integer units of salmon successfully allocated
  locked?: boolean;         // when true, allocation engine skips this row
}

export interface Order {
  orderId: string;          // e.g. ORDER-0001
  customerId: string;       // e.g. CT-0001
  subOrders: SubOrder[];
}
