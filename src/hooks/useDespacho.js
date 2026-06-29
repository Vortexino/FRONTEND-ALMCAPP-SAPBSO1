import { useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { ESTADOS_ARTICULO, useDespachoStore } from '../store/despachoStore';
import { useAuthStore } from '../store/authStore';
import * as despachoService from '../api/despachoService';

const MENSAJE_ERROR_CONEXION = 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';

function vibrarCompletado() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function vibrarErrorEscaneo() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 300);
}

export function useDespacho() {
  const documentos       = useDespachoStore((s) => s.documentos);
  const dispatchActual   = useDespachoStore((s) => s.dispatchActual);
  const itemActual       = useDespachoStore((s) => s.itemActual);
  const estadoUI         = useDespachoStore((s) => s.estadoUI);
  const setEstadoUI      = useDespachoStore((s) => s.setEstadoUI);
  const setDocumentos    = useDespachoStore((s) => s.setDocumentos);
  const iniciarDispatchStore        = useDespachoStore((s) => s.iniciarDispatch);
  const aplicarResultadoEscaneoStore = useDespachoStore((s) => s.aplicarResultadoEscaneo);
  const marcarFaltanteStore         = useDespachoStore((s) => s.marcarFaltante);
  const marcarErrorEscaneoStore     = useDespachoStore((s) => s.marcarErrorEscaneo);
  const revertirErrorEscaneoStore   = useDespachoStore((s) => s.revertirErrorEscaneo);
  const marcarFinalizadoStore       = useDespachoStore((s) => s.marcarFinalizado);
  const resetDispatch    = useDespachoStore((s) => s.resetDispatch);

  const user = useAuthStore((s) => s.user);

  // Facturas abiertas en SAP (OINV) listas para despachar.
  const fetchDocumentos = useCallback(async () => {
    setEstadoUI({ loading: true, error: null });
    try {
      const res = await despachoService.fetchInvoices();
      setDocumentos(res.data ?? []);
      setEstadoUI({ loading: false, error: null });
    } catch {
      setEstadoUI({ loading: false, error: MENSAJE_ERROR_CONEXION });
    }
  }, [setEstadoUI, setDocumentos]);

  // Retomar despacho activo al abrir la app.
  const checkDespachoActivo = useCallback(async () => {
    try {
      const data = await despachoService.getActiveDispatch();
      if (data) iniciarDispatchStore(data);
      return data ?? null;
    } catch {
      return null;
    }
  }, [iniciarDispatchStore]);

  const iniciarDespacho = useCallback(
    async ({ docNum }) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const data = await despachoService.startDispatch({ docNum });
        iniciarDispatchStore(data);
        setEstadoUI({ loading: false, error: null });
        return { ok: true };
      } catch (error) {
        // 409: ya existe un despacho activo → recuperarlo y cargarlo en el store
        if (error?.response?.status === 409) {
          try {
            const active = await despachoService.getActiveDispatch();
            if (active) {
              iniciarDispatchStore(active);
              setEstadoUI({ loading: false, error: null });
              return { ok: true };
            }
          } catch {
            // Si la recuperación falla, caer al error original
          }
        }
        const msg = error?.response?.data?.error || MENSAJE_ERROR_CONEXION;
        setEstadoUI({ loading: false, error: msg });
        return { ok: false, error: msg };
      }
    },
    [setEstadoUI, iniciarDispatchStore]
  );

  // Escaneo de artículo en picking.
  // Validación local previa: el código debe pertenecer a esta factura.
  // El backend adicionalmente valida que sea el nextItem (flujo secuencial).
  const escanearArticulo = useCallback(
    async (codigoEscaneado) => {
      if (!dispatchActual) return { ok: false, motivo: 'sin_sesion' };

      const item = dispatchActual.invoice.items.find((i) => i.itemCode === codigoEscaneado);

      if (!item) {
        vibrarErrorEscaneo();
        // Flash de error en el item actual sugerido
        if (itemActual) {
          marcarErrorEscaneoStore(itemActual);
          setTimeout(() => revertirErrorEscaneoStore(itemActual), 1500);
        }
        return { ok: false, motivo: 'no_pertenece' };
      }

      if (item.estado === ESTADOS_ARTICULO.COMPLETADO) {
        return { ok: false, motivo: 'ya_completado' };
      }

      setEstadoUI({ loading: true, error: null });
      try {
        const scanResult = await despachoService.scanItem({
          dispatchId: dispatchActual.dispatchId,
          itemCode: codigoEscaneado,
        });
        // Usar la respuesta real del backend (ScanResult) para actualizar el store.
        // Esto maneja correctamente items con quantity > 1 (no los marca completos prematuramente).
        aplicarResultadoEscaneoStore(scanResult);
        vibrarCompletado();
        setEstadoUI({ loading: false, error: null });
        return { ok: true, isComplete: scanResult.isComplete };
      } catch (error) {
        const msg = error?.response?.data?.error || MENSAJE_ERROR_CONEXION;
        setEstadoUI({ loading: false, error: msg });
        return { ok: false, motivo: 'conexion', error: msg };
      }
    },
    [dispatchActual, itemActual, setEstadoUI, aplicarResultadoEscaneoStore, marcarErrorEscaneoStore, revertirErrorEscaneoStore]
  );

  // Marca un item como faltante (solo estado local — no hay endpoint para esto).
  const marcarFaltante = useCallback(
    (itemCode) => marcarFaltanteStore(itemCode),
    [marcarFaltanteStore]
  );

  // Todos revisados = todos los items están completos (escaneados) o marcados como faltantes.
  // El backend también valida con isFullyPicked al llamar /dispatch/finish.
  const todosRevisados = useMemo(
    () =>
      !!dispatchActual &&
      dispatchActual.invoice.items.every(
        (item) =>
          item.estado === ESTADOS_ARTICULO.COMPLETADO ||
          item.estado === ESTADOS_ARTICULO.FALTANTE
      ),
    [dispatchActual]
  );

  const confirmarDespacho = useCallback(async () => {
    if (!dispatchActual) return { ok: false };
    setEstadoUI({ loading: true, error: null });
    try {
      const data = await despachoService.finishDispatch({ dispatchId: dispatchActual.dispatchId });
      marcarFinalizadoStore(data?.status ?? 'completed');
      setEstadoUI({ loading: false, error: null });
      return { ok: true };
    } catch (error) {
      const msg = error?.response?.data?.error || MENSAJE_ERROR_CONEXION;
      setEstadoUI({ loading: false, error: msg });
      return { ok: false, error: msg };
    }
  }, [dispatchActual, setEstadoUI, marcarFinalizadoStore]);

  const cancelarDespacho = useCallback(async () => {
    if (!dispatchActual) return { ok: false };
    setEstadoUI({ loading: true, error: null });
    try {
      await despachoService.cancelDispatch({ dispatchId: dispatchActual.dispatchId });
      resetDispatch();
      setEstadoUI({ loading: false, error: null });
      return { ok: true };
    } catch (error) {
      const msg = error?.response?.data?.error || MENSAJE_ERROR_CONEXION;
      setEstadoUI({ loading: false, error: msg });
      return { ok: false, error: msg };
    }
  }, [dispatchActual, setEstadoUI, resetDispatch]);

  return {
    documentos,
    dispatchActual,
    itemActual,
    estadoUI,
    user,
    todosRevisados,
    fetchDocumentos,
    checkDespachoActivo,
    iniciarDespacho,
    escanearArticulo,
    marcarFaltante,
    confirmarDespacho,
    cancelarDespacho,
    resetDispatch,
  };
}
