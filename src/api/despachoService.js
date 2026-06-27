import axiosClient from './axiosClient';

// El frontend de Despacho NO habla directo con SAP. Solo consume el backend propio.

export async function startDispatch({ docNum }) {
  const { data } = await axiosClient.post('/dispatch/start', { docNum });
  // Mapear id → dispatchId para compatibilidad interna
  return { ...data.data, dispatchId: data.data.id };
}

export async function scanItem({ dispatchId, itemCode }) {
  const { data } = await axiosClient.post('/dispatch/scan', { dispatchId, itemCode, qty: 1 });
  return data.data; // ScanResult
}

export async function finishDispatch({ dispatchId }) {
  const { data } = await axiosClient.post('/dispatch/finish', { dispatchId });
  return data.data;
}

export async function cancelDispatch({ dispatchId }) {
  const { data } = await axiosClient.post('/dispatch/cancel', { dispatchId });
  return data.data;
}

export async function getActiveDispatch() {
  const { data } = await axiosClient.get('/dispatch/active/me');
  if (!data.success) return null;
  return { ...data.data, dispatchId: data.data.id };
}

export async function getDispatch(dispatchId) {
  const { data } = await axiosClient.get(`/dispatch/${dispatchId}`);
  return { ...data.data, dispatchId: data.data.id };
}

// Lista facturas abiertas en SAP (OINV) del almacén del usuario.
export async function fetchInvoices() {
  const { data } = await axiosClient.get('/dispatch/invoices');
  return data; // { success, total, data: InvoiceSummary[] }
}
