import axiosClient from './axiosClient';

export async function lookupItem(code) {
  const { data } = await axiosClient.get('/items/lookup', { params: { code } });
  return data.data;
}

export async function searchItems(query) {
  const { data } = await axiosClient.get('/items/search', { params: { q: query } });
  return data.data;
}

export async function assignBarcode(itemCode, barcode) {
  const { data } = await axiosClient.patch(`/items/${encodeURIComponent(itemCode)}/barcode`, { barcode });
  return data.data;
}
