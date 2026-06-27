import { useCallback } from 'react';
import { usePedidosStore } from '../store/pedidosStore';
import { useAuthStore } from '../store/authStore';
import * as pedidosService from '../api/pedidosService';

const MENSAJE_ERROR_CONEXION = 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';

function extraerMensajeError(error) {
  return error?.response?.data?.error || MENSAJE_ERROR_CONEXION;
}

export function usePedidos() {
  const orders = usePedidosStore((s) => s.orders);
  const orderActual = usePedidosStore((s) => s.orderActual);
  const estadoUI = usePedidosStore((s) => s.estadoUI);
  const setEstadoUI = usePedidosStore((s) => s.setEstadoUI);
  const setOrders = usePedidosStore((s) => s.setOrders);
  const setOrderActual = usePedidosStore((s) => s.setOrderActual);
  const updateOrderActual = usePedidosStore((s) => s.updateOrderActual);
  const resetOrderActual = usePedidosStore((s) => s.resetOrderActual);
  const user = useAuthStore((s) => s.user);

  const fetchOrders = useCallback(
    async (statusFilter) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const res = await pedidosService.fetchOrders(statusFilter);
        setOrders(res.data);
        setEstadoUI({ loading: false, error: null });
      } catch (error) {
        setEstadoUI({ loading: false, error: extraerMensajeError(error) });
      }
    },
    [setEstadoUI, setOrders]
  );

  const fetchOrder = useCallback(
    async (orderId) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const order = await pedidosService.getOrder(orderId);
        setOrderActual(order);
        setEstadoUI({ loading: false, error: null });
      } catch (error) {
        setEstadoUI({ loading: false, error: extraerMensajeError(error) });
      }
    },
    [setEstadoUI, setOrderActual]
  );

  const iniciarRevision = useCallback(
    async (orderId) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const order = await pedidosService.reviewOrder(orderId);
        updateOrderActual(order);
        setEstadoUI({ loading: false, error: null });
        return { ok: true };
      } catch (error) {
        const msg = extraerMensajeError(error);
        setEstadoUI({ loading: false, error: msg });
        return { ok: false, error: msg };
      }
    },
    [setEstadoUI, updateOrderActual]
  );

  const actualizarItem = useCallback(
    async (orderId, lineNum, cambios) => {
      try {
        const order = await pedidosService.updateItem(orderId, lineNum, cambios);
        updateOrderActual(order);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: extraerMensajeError(error) };
      }
    },
    [updateOrderActual]
  );

  // Escaneo físico de un artículo durante revisión: POST /orders/:id/items/scan
  // El backend consulta stock SAP en tiempo real y actualiza el item con su availability.
  const escanearItem = useCallback(
    async (orderId, itemCode) => {
      try {
        const order = await pedidosService.scanOrderItem(orderId, itemCode);
        updateOrderActual(order);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: extraerMensajeError(error) };
      }
    },
    [updateOrderActual]
  );

  const confirmarPedido = useCallback(
    async (orderId) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const order = await pedidosService.confirmOrder(orderId);
        updateOrderActual(order);
        setEstadoUI({ loading: false, error: null });
        return { ok: true };
      } catch (error) {
        const msg = extraerMensajeError(error);
        setEstadoUI({ loading: false, error: msg });
        return { ok: false, error: msg };
      }
    },
    [setEstadoUI, updateOrderActual]
  );

  const rechazarPedido = useCallback(
    async (orderId, notes) => {
      setEstadoUI({ loading: true, error: null });
      try {
        const order = await pedidosService.rejectOrder(orderId, notes);
        updateOrderActual(order);
        setEstadoUI({ loading: false, error: null });
        return { ok: true };
      } catch (error) {
        const msg = extraerMensajeError(error);
        setEstadoUI({ loading: false, error: msg });
        return { ok: false, error: msg };
      }
    },
    [setEstadoUI, updateOrderActual]
  );

  return {
    orders,
    orderActual,
    estadoUI,
    user,
    fetchOrders,
    fetchOrder,
    iniciarRevision,
    escanearItem,
    actualizarItem,
    confirmarPedido,
    rechazarPedido,
    resetOrderActual,
  };
}
