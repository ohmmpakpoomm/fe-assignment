export interface Customer {
  customerId: string;
  creditLimit: number;
  usedCredit: number;       // Tracks currently used credit based on allocations
}
