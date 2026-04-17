import { useQuery } from '@tanstack/react-query';
import type { InventoryFilters } from '../types/inventory';
import { fetchCategories, fetchDashboard } from '../services/api';

export function useDashboard(filters: InventoryFilters) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => fetchDashboard(filters),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30,
  });
}
