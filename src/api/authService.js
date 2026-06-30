import axiosClient from './axiosClient';

export async function login({ userId, password }) {
  const { data } = await axiosClient.post('/auth/login', { userId, password });
  return data; // { success, token, user }
}

export async function logout() {
  await axiosClient.post('/auth/logout');
}

export async function getMe() {
  const { data } = await axiosClient.get('/auth/me');
  return data; // { success, user }
}

export async function getWarehouses() {
  const { data } = await axiosClient.get('/auth/warehouses');
  return data.data; // [{ code, name }]
}

export async function switchWarehouse({ warehouseCode }) {
  const { data } = await axiosClient.post('/auth/switch-warehouse', { warehouseCode });
  return data; // { success, token, user }
}

export async function registerUser({ userId, name, password, role, warehouseCodes }) {
  const { data } = await axiosClient.post('/auth/register', { userId, name, password, role, warehouseCodes });
  return data; // { success, message, data }
}
