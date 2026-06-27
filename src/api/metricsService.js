import axiosClient from './axiosClient';

// Un solo call que devuelve todos los datos del dashboard.
// Admin puede filtrar por warehouseCode; operator siempre ve solo el suyo.
export async function getAllMetrics({ warehouseCode } = {}) {
  const params = warehouseCode ? { warehouseCode } : {};
  const { data } = await axiosClient.get('/metrics/all', { params });
  return data.data; // MetricsAll
}

// Conservado para compatibilidad con HomeScreen (solo summary)
export async function getSummary() {
  const { data } = await axiosClient.get('/metrics/summary');
  return data.data;
}
