// src/store/index.ts
import { create } from 'zustand'
import type { Order, Customer, WarehouseStock, PriceTier } from '../types'

interface FilterState {
  searchQuery: string;
  typeFilter: string;
  itemFilter: string;
  warehouseFilter: string;
  supplierFilter: string;
  sortByType: boolean;
  sortByFifo: boolean;
}

interface AppState {
  orders: Order[];
  customers: Customer[];
  warehouseStock: WarehouseStock[];
  priceTiers: PriceTier[];
  filters: FilterState;
  // Actions
  setOrders: (orders: Order[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setWarehouseStock: (stock: WarehouseStock[]) => void;
  setPriceTiers: (tiers: PriceTier[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  
  updateSubOrder: (orderId: string, subOrderId: string, field: string, value: any) => void;
  toggleLock: (orderId: string, subOrderId: string) => void;
  validateAllocations: () => { valid: boolean; violations: number };
  runAutoAllocation: (onComplete?: (result: any) => void, onError?: (error: any) => void) => void;
  commitAllocation: (result: any) => void;
}

export const useStore = create<AppState>((set, get) => ({
  orders: [],
  customers: [],
  warehouseStock: [],
  priceTiers: [],
  filters: { searchQuery: '', typeFilter: '', itemFilter: '', warehouseFilter: '', supplierFilter: '', sortByType: true, sortByFifo: true },

  setOrders: (orders) => set({ orders }),
  setCustomers: (customers) => set({ customers }),
  setWarehouseStock: (stock) => set({ warehouseStock: stock }),
  setPriceTiers: (tiers) => set({ priceTiers: tiers }),
  setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: { searchQuery: '', typeFilter: '', itemFilter: '', warehouseFilter: '', supplierFilter: '', sortByType: true, sortByFifo: true } }),

  commitAllocation: (result) => set({
    orders: result.orders,
    customers: result.customers,
    warehouseStock: result.warehouseStock,
  }),
  
  updateSubOrder: (orderId, subOrderId, field, value) => {
    set((state) => {
      const orders = [...state.orders];
      const orderIdx = orders.findIndex(o => o.orderId === orderId);
      if (orderIdx === -1) return state;

      const subOrders = [...orders[orderIdx].subOrders];
      const subIdx = subOrders.findIndex(so => so.subOrderId === subOrderId);
      if (subIdx === -1) return state;

      subOrders[subIdx] = { ...subOrders[subIdx], [field]: value, locked: true };
      orders[orderIdx] = { ...orders[orderIdx], subOrders };
      return { orders };
    });
  },

  toggleLock: (orderId, subOrderId) => {
    set(state => ({
      orders: state.orders.map(o =>
        o.orderId !== orderId ? o : {
          ...o,
          subOrders: o.subOrders.map(so =>
            so.subOrderId !== subOrderId ? so : { ...so, locked: !so.locked }
          )
        }
      )
    }));
  },

  validateAllocations: () => {
    const state = get();
    let violations = 0;

    state.orders.forEach(o => o.subOrders.forEach(sub => {
      if (sub.allocated > sub.requestQty + 0.001) violations++;
    }));

    const stockMap = new Map<string, number>();
    state.warehouseStock.forEach(s => stockMap.set(`${s.warehouseId}-${s.supplierId}-${s.itemId}`, s.totalCapacity));
    state.orders.forEach(o => o.subOrders.forEach(sub => {
      if (sub.allocated > 0 && sub.warehouseId && sub.warehouseId !== 'WH-000' && sub.supplierId && sub.supplierId !== 'SP-000') {
        const key = `${sub.warehouseId}-${sub.supplierId}-${sub.itemId}`;
        stockMap.set(key, (stockMap.get(key) ?? 0) - sub.allocated);
      }
    }));
    stockMap.forEach(v => { if (v < -0.001) violations++; });

    const creditMap = new Map<string, number>();
    state.customers.forEach(c => creditMap.set(c.customerId, c.creditLimit));
    state.orders.forEach(o => o.subOrders.forEach(sub => {
      if (sub.allocated > 0 && sub.supplierId && sub.supplierId !== 'SP-000') {
        const tier = state.priceTiers.find(t => t.itemId === sub.itemId && t.supplierId === sub.supplierId);
        const tierMultiplier = tier?.tiers.find(t => t.type === sub.type)?.tierMultiplier || 1;
        const unitPrice = tier ? Math.round(tier.basePrice * tierMultiplier * 100) / 100 : 100;
        creditMap.set(o.customerId, (creditMap.get(o.customerId) ?? 0) - Math.round(sub.allocated * unitPrice * 100) / 100);
      }
    }));
    creditMap.forEach(v => { if (v < -0.001) violations++; });

    return { valid: violations === 0, violations };
  },

  runAutoAllocation: (onComplete, onError) => {
    const state = get();
    // Use worker to avoid blocking UI freeze on 5000+ orders
    const worker = new Worker(new URL('../workers/allocation.worker.ts', import.meta.url), { type: 'module' });
    
    worker.postMessage({
      orders: state.orders,
      customers: state.customers,
      warehouseStock: state.warehouseStock,
      priceTiers: state.priceTiers
    });
    
    worker.onmessage = (e) => {
      if (e.data.type === 'SUCCESS') {
        const result = e.data.payload;
        if (onComplete) onComplete(result);
      } else {
        if (onError) onError(e.data.error);
        console.error("Allocation Worker Error", e.data.error);
      }
      worker.terminate();
    };
  }
}))
