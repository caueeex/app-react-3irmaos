import type { ValidityLevel } from '../types/inventory';
import { parseISODate, startOfDay } from './date';

export function daysUntilExpiry(expiryIso: string): number {
  const today = startOfDay(new Date());
  const expiry = startOfDay(parseISODate(expiryIso));
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function validityLevel(daysLeft: number): ValidityLevel {
  if (daysLeft <= 3) return 'critical';
  if (daysLeft <= 7) return 'warning';
  return 'ok';
}

export function validityLabel(daysLeft: number): string {
  if (daysLeft < 0) return 'Vencido';
  if (daysLeft === 0) return 'Vence hoje';
  if (daysLeft === 1) return '1 dia';
  return `${daysLeft} dias`;
}
