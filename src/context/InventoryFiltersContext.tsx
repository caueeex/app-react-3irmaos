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

type Value = {
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

const Ctx = createContext<Value | undefined>(undefined);

export function InventoryFiltersProvider({
  children,
}: {
  children: ReactNode;
}) {
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

  const value = useMemo(
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

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInventoryFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInventoryFilters requires provider');
  return v;
}
