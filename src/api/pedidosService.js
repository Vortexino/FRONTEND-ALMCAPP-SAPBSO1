import axiosClient from './axiosClient';

export async function fetchOrders(statusFilter) {
  const params = statusFilter ? { status: statusFilter } : {};
  const { data } = await axiosClient.get('/orders', { params });
  return data; // { data: Order[], total: number }
}

export async function getOrder(orderId) {
  const { data } = await axiosClient.get(`/orders/${orderId}`);
  return data; // Order
}

export async function getAvailability(orderId) {
  const { data } = await axiosClient.get(`/orders/${orderId}/availability`);
  return data; // { orderId, items: AvailabilityItem[] }
}

export async function reviewOrder(orderId) {
  const { data } = await axiosClient.post(`/orders/${orderId}/review`, {});
  return data; // Order
}

// Picking físico: escanea el código de barras de un artículo durante la revisión.
// El backend resuelve si es barCode o itemCode y actualiza availability del item.
export async function scanOrderItem(orderId, scannedCode) {
  const { data } = await axiosClient.post(`/orders/${orderId}/items/scan`, { scannedCode });
  return data; // Order completo actualizado
}

export async function updateItem(orderId, lineNum, { availability, transferNote }) {
  const body = { availability };
  if (transferNote) body.transferNote = transferNote;
  const { data } = await axiosClient.patch(`/orders/${orderId}/items/${lineNum}`, body);
  return data; // Order
}

export async function confirmOrder(orderId) {
  const { data } = await axiosClient.post(`/orders/${orderId}/confirm`, {});
  return data; // Order
}

export async function rejectOrder(orderId, notes) {
  const body = notes ? { notes } : {};
  const { data } = await axiosClient.post(`/orders/${orderId}/reject`, body);
  return data; // Order
}
