export type ValidityLevel = 'ok' | 'warning' | 'critical';

export interface InventoryItem {
  id: string;
  productName: string;
  lot: string;
  rfid?: string;
  category: string;
  manufactureDate: string;
  expiryDate: string;
  deliveryPending: boolean;
  quantity: number;
}

export interface InventoryFilters {
  manufactureFrom?: string;
  manufactureTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
  category?: string;
  lotOrRfid?: string;
}

export interface MovementPoint {
  label: string;
  inflow: number;
  outflow: number;
}

export interface StockOverviewPoint {
  label: string;
  total: number;
}

export interface ValidityBuckets {
  within3: number;
  within5: number;
  within7: number;
}

export interface DashboardPayload {
  items: InventoryItem[];
  itemsForDelivery: number;
  totalItems: number;
  criticalItems: number;
  stockOverview: StockOverviewPoint[];
  validityBuckets: ValidityBuckets;
  movement: MovementPoint[];
}
