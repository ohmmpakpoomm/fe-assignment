export const ORDER_TYPE = {
  EMERGENCY: 'EMERGENCY',
  OVERDUE: 'OVERDUE',
  DAILY: 'DAILY',
} as const;

export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
