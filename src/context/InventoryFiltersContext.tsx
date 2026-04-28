import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { InventoryFilters } from '../types/inventory';

const empty: InventoryFilters = {};

type FiltersSlice = {
  draft: InventoryFilters;
  applied: InventoryFilters;
  setDraft: (patch: Partial<InventoryFilters>) => void;
  setDraftField: <K extends keyof InventoryFilters>(
    key: K,
    val: InventoryFilters[K],
  ) => void;
  applyDraft: () => void;
  reset: () => void;
};

type Value = {
  /** Aba Início (dashboard) */
  dashboard: FiltersSlice;
  /** Aba Inventário — independente da aba Início */
  inventoryTab: FiltersSlice;
};

const Ctx = createContext<Value | undefined>(undefined);

function useSliceState(): FiltersSlice {
  const [draft, setDraftState] = useState<InventoryFilters>(empty);
  const [applied, setApplied] = useState<InventoryFilters>(empty);

  const setDraft = useCallback((patch: Partial<InventoryFilters>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setDraftField = useCallback(
    <K extends keyof InventoryFilters>(key: K, val: InventoryFilters[K]) => {
      setDraftState((prev) => ({ ...prev, [key]: val }));
    },
    [],
  );

  const applyDraft = useCallback(() => {
    setApplied({ ...draft });
  }, [draft]);

  const reset = useCallback(() => {
    setDraftState(empty);
    setApplied(empty);
  }, []);

  return useMemo(
    () => ({
      draft,
      applied,
      setDraft,
      setDraftField,
      applyDraft,
      reset,
    }),
    [draft, applied, setDraft, setDraftField, applyDraft, reset],
  );
}

export function InventoryFiltersProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dashboard = useSliceState();
  const inventoryTab = useSliceState();

  const value = useMemo(
    () => ({
      dashboard,
      inventoryTab,
    }),
    [dashboard, inventoryTab],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDashboardFilters requires InventoryFiltersProvider');
  return v.dashboard;
}

export function useInventoryTabFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInventoryTabFilters requires InventoryFiltersProvider');
  return v.inventoryTab;
}
