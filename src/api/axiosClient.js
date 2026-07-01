import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Cambiar esta IP por la IP local del servidor cuando se pruebe en dispositivo físico.
// En emulador Android usar http://10.0.2.2:3000
// En dispositivo físico usar la IP LAN del servidor, ej: http://192.168.1.100:3000
export const BASE_URL = 'https://boulevard-projection-alot-fin.trycloudflare.com';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

axiosClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
