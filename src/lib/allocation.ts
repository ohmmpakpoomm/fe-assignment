import type { Order, Customer, WarehouseStock, PriceTier } from '../types'
import { bankersRound } from './rounding'

export interface AllocationPayload {
  orders: Order[];
  customers: Customer[];
  warehouseStock: WarehouseStock[];
  priceTiers: PriceTier[];
}

export function runAllocation(payload: AllocationPayload): AllocationPayload {
  // Deep clone to avoid mutating input directly cross-thread
  const orders = JSON.parse(JSON.stringify(payload.orders)) as Order[];
  const customers = JSON.parse(JSON.stringify(payload.customers)) as Customer[];
  const warehouseStock = JSON.parse(JSON.stringify(payload.warehouseStock)) as WarehouseStock[];
  const priceTiers = payload.priceTiers;

  const stockMap = new Map();
  warehouseStock.forEach(s => stockMap.set(`${s.warehouseId}-${s.supplierId}-${s.itemId}`, s));

  const customerMap = new Map();
  customers.forEach(c => customerMap.set(c.customerId, c));

  // Reset unlocked allocations; locked rows keep their current allocated value
  orders.forEach(o => o.subOrders.forEach(so => { if (!so.locked) so.allocated = 0; }));
  customers.forEach(c => c.usedCredit = 0);
  warehouseStock.forEach(s => s.stock = s.totalCapacity);

  // Pre-subtract locked rows from available stock and credit
  orders.forEach(o => {
    const customer = customerMap.get(o.customerId);
    o.subOrders.forEach(so => {
      if (!so.locked || so.allocated <= 0) return;
      if (so.warehouseId && so.warehouseId !== 'WH-000' && so.supplierId && so.supplierId !== 'SP-000') {
        const stockObj = stockMap.get(`${so.warehouseId}-${so.supplierId}-${so.itemId}`);
        if (stockObj) stockObj.stock -= so.allocated;
      }
      if (customer) {
        const tierConfig = priceTiers.find(t => t.itemId === so.itemId && t.supplierId === so.supplierId);
        const tierMultiplier = tierConfig?.tiers.find(t => t.type === so.type)?.tierMultiplier || 1;
        const unitPrice = tierConfig ? bankersRound(tierConfig.basePrice * tierMultiplier) : 100;
        customer.usedCredit += bankersRound(so.allocated * unitPrice);
      }
    });
  });

  // Flatten sub-orders to sort and run through rules (locked rows excluded)
  const flatSubOrders: { sub: any, orderId: string, customerId: string, createDate: Date, typeRank: number }[] = [];

  const TYPE_RANK: Record<string, number> = { 'EMERGENCY': 1, 'OVERDUE': 2, 'DAILY': 3 };

  orders.forEach(o => {
    o.subOrders.forEach(so => {
      if (so.locked) return;
      flatSubOrders.push({
        sub: so,
        orderId: o.orderId,
        customerId: o.customerId,
        createDate: new Date(so.createDate),
        typeRank: TYPE_RANK[so.type] || 99
      });
    });
  });

  // Sort Rules: 1. Priority Type, 2. FIFO
  flatSubOrders.sort((a, b) => {
    if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
    return a.createDate.getTime() - b.createDate.getTime();
  });

  for (const job of flatSubOrders) {
    const { sub, customerId } = job;
    const customer = customerMap.get(customerId);
    if (!customer) continue;

    const availableCredit = customer.creditLimit - customer.usedCredit;
    if (availableCredit <= 0) continue;

    // Resolve 'ANY' Warehouse or Supplier (WH-000 / SP-000)
    let bestStockObj: WarehouseStock | null = null;
    let maxStockVal = -1;

    if (sub.warehouseId === 'WH-000' || sub.supplierId === 'SP-000') {
      for (const s of warehouseStock) {
        if (s.itemId !== sub.itemId) continue;
        if (sub.warehouseId !== 'WH-000' && s.warehouseId !== sub.warehouseId) continue;
        if (sub.supplierId !== 'SP-000' && s.supplierId !== sub.supplierId) continue;

        if (s.stock > maxStockVal) {
          maxStockVal = s.stock;
          bestStockObj = s;
        }
      }
      // Mutate to resolved WH/SP so downstream display uses real values
      if (bestStockObj) {
        sub.warehouseId = bestStockObj.warehouseId;
        sub.supplierId = bestStockObj.supplierId;
      }
    } else {
      bestStockObj = stockMap.get(`${sub.warehouseId}-${sub.supplierId}-${sub.itemId}`);
    }

    if (!bestStockObj || bestStockObj.stock <= 0) continue;

    // Apply Price Tier Percentage
    const tierConfig = priceTiers.find(t => t.itemId === sub.itemId && t.supplierId === bestStockObj!.supplierId);
    let unitPrice = 0;
    if (tierConfig) {
      const tierPct = tierConfig.tiers.find(t => t.type === sub.type)?.tierMultiplier || 1;
      unitPrice = bankersRound(tierConfig.basePrice * tierPct);
    } else {
      unitPrice = 100;
    }

    const maxStock = bestStockObj.stock;
    const maxAffordableQty = unitPrice > 0 ? Math.floor(availableCredit / unitPrice) : maxStock;

    const allocating = Math.min(sub.requestQty, maxStock, maxAffordableQty);

    if (allocating > 0) {
      sub.allocated = allocating;
      bestStockObj.stock -= allocating;
      customer.usedCredit += bankersRound(allocating * unitPrice);
    }
  }

  return { orders, customers, warehouseStock, priceTiers };
}
