import { create } from 'zustand';

export const ESTADOS_ARTICULO = {
  PENDIENTE: 'pendiente',
  COMPLETADO: 'completado',
  FALTANTE: 'faltante',
  ERROR_ESCANEO: 'error_escaneo',
};

function buscarSiguientePendiente(items) {
  const siguiente = items.find((item) => item.estado === ESTADOS_ARTICULO.PENDIENTE);
  return siguiente ? siguiente.itemCode : null;
}

export const useDespachoStore = create((set, get) => ({
  documentos: [],
  dispatchActual: null, // { dispatchId, userId, warehouseId, invoice: { docNum, items: [] }, status }
  itemActual: null,
  estadoUI: { loading: false, error: null },

  // TODO: reemplazar por el userId real de authStore cuando el módulo Login esté integrado.
  usuarioEscaneo: 'usuario_demo',

  setEstadoUI: (estadoUI) => set({ estadoUI }),

  setDocumentos: (documentos) => set({ documentos }),

  iniciarDispatch: (dispatchData) => {
    const items = dispatchData.invoice.items.map((item) => ({
      ...item,
      estado: ESTADOS_ARTICULO.PENDIENTE,
      // TODO (Módulo 2): agregar cantidadEncontrada cuando se habilite observacionFaltantes en SAP
    }));
    const dispatchActual = { ...dispatchData, invoice: { ...dispatchData.invoice, items } };
    set({ dispatchActual, itemActual: buscarSiguientePendiente(items) });
  },

  marcarCompletado: (itemCode) => {
    const { dispatchActual } = get();
    if (!dispatchActual) return;
    const items = dispatchActual.invoice.items.map((item) =>
      item.itemCode === itemCode
        ? { ...item, estado: ESTADOS_ARTICULO.COMPLETADO, picked: item.quantity }
        : item
    );
    set({
      dispatchActual: { ...dispatchActual, invoice: { ...dispatchActual.invoice, items } },
      itemActual: buscarSiguientePendiente(items),
    });
  },

  marcarFaltante: (itemCode) => {
    const { dispatchActual } = get();
    if (!dispatchActual) return;
    const items = dispatchActual.invoice.items.map((item) =>
      item.itemCode === itemCode ? { ...item, estado: ESTADOS_ARTICULO.FALTANTE } : item
    );
    set({
      dispatchActual: { ...dispatchActual, invoice: { ...dispatchActual.invoice, items } },
      itemActual: buscarSiguientePendiente(items),
    });
  },

  marcarErrorEscaneo: (itemCode) => {
    const { dispatchActual } = get();
    if (!dispatchActual || !itemCode) return;
    const items = dispatchActual.invoice.items.map((item) =>
      item.itemCode === itemCode ? { ...item, estado: ESTADOS_ARTICULO.ERROR_ESCANEO } : item
    );
    set({ dispatchActual: { ...dispatchActual, invoice: { ...dispatchActual.invoice, items } } });
  },

  revertirErrorEscaneo: (itemCode) => {
    const { dispatchActual } = get();
    if (!dispatchActual || !itemCode) return;
    const items = dispatchActual.invoice.items.map((item) =>
      item.itemCode === itemCode && item.estado === ESTADOS_ARTICULO.ERROR_ESCANEO
        ? { ...item, estado: ESTADOS_ARTICULO.PENDIENTE }
        : item
    );
    set({ dispatchActual: { ...dispatchActual, invoice: { ...dispatchActual.invoice, items } } });
  },

  marcarFinalizado: (status) => {
    const { dispatchActual } = get();
    if (!dispatchActual) return;
    set({ dispatchActual: { ...dispatchActual, status } });
  },

  resetDispatch: () => set({ dispatchActual: null, itemActual: null }),
}));
