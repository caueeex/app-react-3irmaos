import type {
  DashboardPayload,
  InventoryFilters,
  InventoryItem,
} from '../types/inventory';
import { parseISODate, startOfDay } from '../utils/date';
import { daysUntilExpiry } from '../utils/validity';

const categories = ['Congelados', 'Refrigerados', 'Secos', 'Bebidas', 'Higiene'];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const today = startOfDay(new Date());

const seedItems: InventoryItem[] = Array.from({ length: 24 }).map((_, i) => {
  const cat = categories[i % categories.length];
  const manufacture = addDays(today, -(120 + i * 3));
  const expiryOffset = [2, 4, 6, 9, 15, 22, 40, 90][i % 8];
  const expiry = addDays(today, expiryOffset - (i % 3));
  return {
    id: `item-${i + 1}`,
    productName: `Produto ${String(i + 1).padStart(2, '0')} — ${cat}`,
    lot: `LT-${2024 + (i % 2)}-${1000 + i}`,
    rfid: `RFID-${(100000 + i * 791).toString(16).toUpperCase()}`,
    category: cat,
    manufactureDate: iso(manufacture),
    expiryDate: iso(expiry),
    deliveryPending: i % 5 === 0,
    quantity: 10 + (i % 7) * 4,
  };
});

function matchesFilters(item: InventoryItem, f: InventoryFilters): boolean {
  const mFrom = f.manufactureFrom ? parseISODate(f.manufactureFrom) : null;
  const mTo = f.manufactureTo ? parseISODate(f.manufactureTo) : null;
  const eFrom = f.expiryFrom ? parseISODate(f.expiryFrom) : null;
  const eTo = f.expiryTo ? parseISODate(f.expiryTo) : null;
  const m = parseISODate(item.manufactureDate);
  const e = parseISODate(item.expiryDate);

  if (mFrom && m < startOfDay(mFrom)) return false;
  if (mTo && m > startOfDay(mTo)) return false;
  if (eFrom && e < startOfDay(eFrom)) return false;
  if (eTo && e > startOfDay(eTo)) return false;
  if (f.lotOrRfid) {
    const q = f.lotOrRfid.trim().toLowerCase();
    const hay = `${item.lot} ${item.rfid ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function buildValidityBuckets(items: InventoryItem[]) {
  let within3 = 0;
  let within5 = 0;
  let within7 = 0;
  for (const it of items) {
    const d = daysUntilExpiry(it.expiryDate);
    if (d >= 0 && d <= 3) within3 += 1;
    if (d >= 0 && d <= 5) within5 += 1;
    if (d >= 0 && d <= 7) within7 += 1;
  }
  return { within3, within5, within7 };
}

function buildMovement(items: InventoryItem[]) {
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const baseIn = 40 + (items.length % 9) * 3;
  const baseOut = 32 + (items.length % 7) * 2;
  return labels.map((label, idx) => ({
    label,
    inflow: baseIn + idx * 4 + (idx % 2) * 6,
    outflow: baseOut + idx * 3 + ((idx + 1) % 3) * 5,
  }));
}

function buildOverviewSeries(items: InventoryItem[]) {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  return labels.map((label, idx) => ({
    label,
    total: Math.max(120, Math.round(totalQty * (0.55 + idx * 0.07))),
  }));
}

export function getMockCategories(): string[] {
  return ['Todas', ...categories];
}

export function buildDashboardFromFilters(
  filters: InventoryFilters,
): DashboardPayload {
  const items = seedItems.filter((i) => matchesFilters(i, filters));
  const itemsForDelivery = items.filter((i) => i.deliveryPending).length;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const criticalItems = items.filter(
    (i) => daysUntilExpiry(i.expiryDate) <= 3,
  ).length;

  return {
    items,
    itemsForDelivery,
    totalItems,
    criticalItems,
    stockOverview: buildOverviewSeries(items),
    validityBuckets: buildValidityBuckets(items),
    movement: buildMovement(items),
  };
}

export const MOCK_USER = {
  name: 'Operador Logística',
};
