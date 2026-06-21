import axios from 'axios';

// STUB temporal: el dueño real de este archivo es el módulo Login
// (interceptor de token depende de authStore, que no existe todavía).
// Ajustar baseURL al backend propio real y agregar el interceptor cuando se integre.
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

export default axiosClient;
