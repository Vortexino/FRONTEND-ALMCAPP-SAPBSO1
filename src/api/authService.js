import axiosClient from './axiosClient';

export async function login({ userId, password, warehouseCode }) {
  const { data } = await axiosClient.post('/auth/login', { userId, password, warehouseCode });
  return data; // { success, token, user }
}

export async function logout() {
  await axiosClient.post('/auth/logout');
}

export async function getMe() {
  const { data } = await axiosClient.get('/auth/me');
  return data; // { success, user }
}
