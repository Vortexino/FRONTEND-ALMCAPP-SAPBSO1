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
    set((state) => ({
      orderActual: order,
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
    })),

  resetOrderActual: () => set({ orderActual: null }),
}));
