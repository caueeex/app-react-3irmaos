import axios from 'axios';
import type { DashboardPayload, InventoryFilters } from '../types/inventory';
import { buildDashboardFromFilters, getMockCategories } from './mockData';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com',
  timeout: 15000,
});

/**
 * Quando a API real estiver disponível, substitua o corpo por algo como:
 * const { data } = await api.post<DashboardPayload>('/v1/dashboard', filters);
 * return data;
 */
export async function fetchDashboard(
  filters: InventoryFilters,
): Promise<DashboardPayload> {
  await delay(450);
  return buildDashboardFromFilters(filters);
}

export async function fetchCategories(): Promise<string[]> {
  await delay(120);
  return getMockCategories();
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
