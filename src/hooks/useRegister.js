import { useCallback, useEffect, useState } from 'react';
import * as authService from '../api/authService';

const ROLES = [
  { value: 'operator', label: 'Operador' },
  { value: 'manager', label: 'Supervisor' },
  { value: 'admin',   label: 'Admin' },
];

const EMPTY_FORM = { userId: '', name: '', password: '', role: 'operator', warehouseCodes: [] };

export function useRegister() {
  const [warehouses, setWarehouses]   = useState([]);
  const [loadingWH, setLoadingWH]     = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);

  const fetchWarehouses = useCallback(async () => {
    setLoadingWH(true);
    try {
      const data = await authService.getWarehouses();
      setWarehouses(data ?? []);
    } catch {
      // no bloquear el formulario si los almacenes fallan
    } finally {
      setLoadingWH(false);
    }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  const toggleWarehouse = useCallback((code) => {
    setForm((prev) => {
      const codes = prev.warehouseCodes.includes(code)
        ? prev.warehouseCodes.filter((c) => c !== code)
        : [...prev.warehouseCodes, code];
      return { ...prev, warehouseCodes: codes };
    });
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    const { userId, name, password, role, warehouseCodes } = form;
    if (!userId.trim() || !name.trim() || !password.trim()) {
      setError('Completa todos los campos obligatorios.');
      return { ok: false };
    }
    if (role !== 'admin' && warehouseCodes.length === 0) {
      setError('Selecciona al menos un almacén.');
      return { ok: false };
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.registerUser({ userId: userId.trim(), name: name.trim(), password: password.trim(), role, warehouseCodes });
      setSuccess(res.message ?? 'Usuario creado correctamente.');
      setForm(EMPTY_FORM);
      return { ok: true };
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'No se pudo crear el usuario.';
      setError(msg);
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }, []);

  return { ROLES, warehouses, loadingWH, form, submitting, error, success, setField, toggleWarehouse, submit, reset };
}
