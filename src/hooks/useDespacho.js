import { useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { ESTADOS_ARTICULO, useDespachoStore } from '../store/despachoStore';
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
  const documentos = useDespachoStore((s) => s.documentos);
  const dispatchActual = useDespachoStore((s) => s.dispatchActual);
  const itemActual = useDespachoStore((s) => s.itemActual);
  const estadoUI = useDespachoStore((s) => s.estadoUI);
  const usuarioEscaneo = useDespachoStore((s) => s.usuarioEscaneo);
  const setEstadoUI = useDespachoStore((s) => s.setEstadoUI);
  const setDocumentos = useDespachoStore((s) => s.setDocumentos);
  const iniciarDispatchStore = useDespachoStore((s) => s.iniciarDispatch);
  const marcarCompletadoStore = useDespachoStore((s) => s.marcarCompletado);
  const marcarFaltanteStore = useDespachoStore((s) => s.marcarFaltante);
  const marcarErrorEscaneoStore = useDespachoStore((s) => s.marcarErrorEscaneo);
  const revertirErrorEscaneoStore = useDespachoStore((s) => s.revertirErrorEscaneo);
  const marcarFinalizadoStore = useDespachoStore((s) => s.marcarFinalizado);
  const resetDispatch = useDespachoStore((s) => s.resetDispatch);

  const fetchDocumentos = useCallback(
    async (query) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const data = await despachoService.fetchOpenDocuments(query);
        setDocumentos(data);
        setEstadoUI({ loading: false, error: null });
      } catch (error) {
        setEstadoUI({ loading: false, error: MENSAJE_ERROR_CONEXION });
      }
    },
    [setEstadoUI, setDocumentos]
  );

  const iniciarDespacho = useCallback(
    async ({ docNum, warehouseId }) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const data = await despachoService.startDispatch({ docNum, userId: usuarioEscaneo, warehouseId });
        iniciarDispatchStore(data);
        setEstadoUI({ loading: false, error: null });
        return { ok: true };
      } catch (error) {
        setEstadoUI({ loading: false, error: MENSAJE_ERROR_CONEXION });
        return { ok: false };
      }
    },
    [setEstadoUI, iniciarDispatchStore, usuarioEscaneo]
  );

  // Escaneo de un artículo durante el picking. La validación de "¿este código
  // pertenece a esta factura?" se hace localmente contra los items ya traídos por
  // /dispatch/start (Master Data que ya entregó SAP vía el backend); solo cuando
  // corresponde a un item pendiente se confirma el escaneo contra el backend.
  const escanearArticulo = useCallback(
    async (codigoEscaneado) => {
      if (!dispatchActual) return { ok: false, motivo: 'sin_sesion' };

      const item = dispatchActual.invoice.items.find((i) => i.itemCode === codigoEscaneado);

      if (!item) {
        vibrarErrorEscaneo();
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
        await despachoService.scanItem({ dispatchId: dispatchActual.dispatchId, itemCode: codigoEscaneado });
        marcarCompletadoStore(codigoEscaneado);
        vibrarCompletado();
        setEstadoUI({ loading: false, error: null });
        return { ok: true };
      } catch (error) {
        setEstadoUI({ loading: false, error: MENSAJE_ERROR_CONEXION });
        return { ok: false, motivo: 'conexion' };
      }
    },
    [dispatchActual, itemActual, setEstadoUI, marcarCompletadoStore, marcarErrorEscaneoStore, revertirErrorEscaneoStore]
  );

  // Acción explícita por artículo. Nunca bloquea el resto del pedido y no requiere
  // llamada al backend: el contrato actual no tiene un campo estructurado de
  // "faltante" (ver sección 8.1/8.2 del contexto), vive solo en el estado local.
  const marcarFaltante = useCallback(
    (itemCode) => {
      marcarFaltanteStore(itemCode);
    },
    [marcarFaltanteStore]
  );

  const todosRevisados = useMemo(
    () =>
      !!dispatchActual &&
      dispatchActual.invoice.items.every(
        (item) => item.estado === ESTADOS_ARTICULO.COMPLETADO || item.estado === ESTADOS_ARTICULO.FALTANTE
      ),
    [dispatchActual]
  );

  const confirmarDespacho = useCallback(async () => {
    if (!dispatchActual || !todosRevisados) return { ok: false };
    setEstadoUI({ loading: true, error: null });
    try {
      const fechaHoraEscaneo = new Date().toISOString();
      const data = await despachoService.finishDispatch({
        dispatchId: dispatchActual.dispatchId,
        escaneado: true,
        fechaHoraEscaneo,
        usuarioEscaneo,
      });
      marcarFinalizadoStore(data?.status ?? 'finalizado');
      setEstadoUI({ loading: false, error: null });
      return { ok: true };
    } catch (error) {
      setEstadoUI({ loading: false, error: MENSAJE_ERROR_CONEXION });
      return { ok: false };
    }
  }, [dispatchActual, todosRevisados, setEstadoUI, usuarioEscaneo, marcarFinalizadoStore]);

  return {
    documentos,
    dispatchActual,
    itemActual,
    estadoUI,
    todosRevisados,
    fetchDocumentos,
    iniciarDespacho,
    escanearArticulo,
    marcarFaltante,
    confirmarDespacho,
    resetDispatch,
  };
}
