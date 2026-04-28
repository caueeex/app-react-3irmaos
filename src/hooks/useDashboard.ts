import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { InventoryFilters } from '../types/inventory';
import { fetchDashboard } from '../services/api';

export function useDashboard(filters: InventoryFilters) {
  const { user, sessionReady } = useAuth();
  const enabled = sessionReady && !!user;

  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => fetchDashboard(filters),
    enabled,
    staleTime: 30_000,
  });
}
