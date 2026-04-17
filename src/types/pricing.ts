import type { OrderType } from '../constraints/orderType';

export interface PriceTier {
  itemId: string;
  supplierId: string;
  basePrice: number;
  tiers: { type: OrderType; tierMultiplier: number }[];
}
