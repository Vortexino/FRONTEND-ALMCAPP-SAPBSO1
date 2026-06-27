import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import * as metricsService from '../api/metricsService';

const INITIAL_METRICS = {
  summary:        { orders_pending: null, orders_confirmed: null, orders_today: null, active_users: null, dispatches_today: null },
  ordersByStatus: [],
  reviewTime:     [],
  dispatches:     [],
  volume:         [],
  operators:      [],
  sessions:       [],
};

export function useDashboard() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [metrics, setMetrics]             = useState(INITIAL_METRICS);
  const [warehouseFilter, setWarehouseFilter] = useState(null); // null = todos
  const [loading, setLoading]             = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);
  const intervalRef                       = useRef(null);

  const fetchAll = useCallback(async (warehouse) => {
    setError(null);
    try {
      const data = await metricsService.getAllMetrics(
        warehouse ? { warehouseCode: warehouse } : {}
      );
      setMetrics(data ?? INITIAL_METRICS);
    } catch {
      setError('No se pudieron cargar las métricas.');
    }
  }, []);

  const load = useCallback(async (warehouse = warehouseFilter) => {
    setLoading(true);
    await fetchAll(warehouse);
    setLoading(false);
  }, [fetchAll, warehouseFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll(warehouseFilter);
    setRefreshing(false);
  }, [fetchAll, warehouseFilter]);

  const changeWarehouse = useCallback((wh) => {
    setWarehouseFilter(wh);
    clearInterval(intervalRef.current);
    load(wh);
    intervalRef.current = setInterval(() => fetchAll(wh), 60_000);
  }, [load, fetchAll]);

  useEffect(() => {
    load(warehouseFilter);
    intervalRef.current = setInterval(() => fetchAll(warehouseFilter), 60_000);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Alias para HomeScreen que solo necesita el summary
  const summary = metrics.summary;
  const fetchSummary = load;

  return {
    metrics,
    summary,
    warehouseFilter,
    changeWarehouse,
    isAdmin,
    user,
    loading,
    refreshing,
    error,
    onRefresh,
    fetchSummary,
  };
}
