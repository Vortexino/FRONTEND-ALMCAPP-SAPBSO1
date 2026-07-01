import { create } from 'zustand';

export const ORDER_STATUS = {
  RECEIVED: 'received',
  REVIEWING: 'reviewing',
  CONFIRMED: 'confirmed',
  PARTIAL: 'partial',
  REJECTED: 'rejected',
  DISPATCHED: 'dispatched',
};

export const ITEM_AVAILABILITY = {
  PENDING: 'pending',
  AVAILABLE: 'available',
  NEEDS_TRANSFER: 'needs_transfer',
  UNAVAILABLE: 'unavailable',
};

export const usePedidosStore = create((set) => ({
  orders: [],
  orderActual: null,
  estadoUI: { loading: false, error: null },

  setEstadoUI: (estadoUI) => set({ estadoUI }),
  setOrders: (orders) => set({ orders }),
  setOrderActual: (orderActual) => set({ orderActual }),

  updateOrderActual: (order) =>
    set((state) => {
      // Preservar barCode del estado anterior si el response no lo trae
      const prevItems = state.orderActual?.items ?? [];
      const items = order.items?.map((item) => {
        const prev = prevItems.find((p) => p.lineNum === item.lineNum);
        return { ...item, barCode: item.barCode ?? prev?.barCode };
      }) ?? order.items;
      const merged = { ...order, items };
      return {
        orderActual: merged,
        orders: state.orders.map((o) => (o.id === merged.id ? merged : o)),
      };
    }),

  // Actualización optimista de un item — mismo patrón que marcarFaltante en despachoStore.
  // El hook lo aplica antes del API call para que la UI cambie sin esperar la red.
  optimisticUpdateItem: (lineNum, changes) =>
    set((state) => {
      if (!state.orderActual) return {};
      return {
        orderActual: {
          ...state.orderActual,
          items: state.orderActual.items.map((item) =>
            item.lineNum === lineNum ? { ...item, ...changes } : item
          ),
        },
      };
    }),

  resetOrderActual: () => set({ orderActual: null }),
}));
