import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import * as authService from '../api/authService';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setLoading = useAuthStore((s) => s.setLoading);

  const login = useCallback(
    async ({ userId, password }) => {
      try {
        const res = await authService.login({ userId, password });
        await SecureStore.setItemAsync('auth_token', res.token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(res.user));
        setAuth(res.user, res.token);
        return { ok: true };
      } catch (error) {
        const mensaje = error?.response?.data?.error || 'Credenciales inválidas o sin conexión.';
        return { ok: false, error: mensaje };
      }
    },
    [setAuth]
  );

  const switchWarehouse = useCallback(
    async ({ warehouseCode }) => {
      try {
        const res = await authService.switchWarehouse({ warehouseCode });
        await SecureStore.setItemAsync('auth_token', res.token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(res.user));
        setAuth(res.user, res.token);
        return { ok: true };
      } catch (error) {
        const mensaje = error?.response?.data?.error || 'No se pudo cambiar el almacén.';
        return { ok: false, error: mensaje };
      }
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {}
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    clearAuth();
  }, [clearAuth]);

  // Verificar token guardado al abrir la app
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const savedToken = await SecureStore.getItemAsync('auth_token');
      if (!savedToken) {
        clearAuth();
        return;
      }
      const res = await authService.getMe();
      setAuth(res.user, savedToken);
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
      clearAuth();
    }
  }, [setAuth, clearAuth, setLoading]);

  return { user, token, isLoading, login, logout, checkAuth, switchWarehouse };
}
