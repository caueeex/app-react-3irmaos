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
  lotOrRfid?: string;
  /** Nome parcial do produto (mesmo filtro da API web). */
  categoria?: string;
}

export interface MovementPoint {
  label: string;
  inflow: number;
  outflow: number;
  /** Movimentações tipo PERDA no período (por semana). */
  losses: number;
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
  /** Pacotes com validade já ultrapassada (inventário filtrado). */
  expiredItems: number;
  /** Entradas − saídas no mês atual (mesma base do gráfico de movimentação). */
  stockDeltaMonth: number;
  /** Total de registros PERDA no mês atual. */
  lossesMonthTotal: number;
  stockOverview: StockOverviewPoint[];
  validityBuckets: ValidityBuckets;
  movement: MovementPoint[];
}
