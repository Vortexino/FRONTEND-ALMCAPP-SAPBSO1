import { create } from 'zustand';

export const ESTADOS_ARTICULO = {
  PENDIENTE: 'pendiente',
  COMPLETADO: 'completado',
  FALTANTE: 'faltante',
  ERROR_ESCANEO: 'error_escaneo',
};

function estadoDesdeItem(dispatchItem) {
  // completed viene del backend; faltante es solo frontend
  return dispatchItem.completed ? ESTADOS_ARTICULO.COMPLETADO : ESTADOS_ARTICULO.PENDIENTE;
}

export const useDespachoStore = create((set, get) => ({
  documentos: [],
  dispatchActual: null,
  itemActual: null,          // itemCode del próximo a escanear
  estadoUI: { loading: false, error: null },

  setEstadoUI: (estadoUI) => set({ estadoUI }),
  setDocumentos: (documentos) => set({ documentos }),

  iniciarDispatch: (dispatchData) => {
    // Añadir campo `estado` (frontend) a cada item basado en su estado real del backend
    const items = dispatchData.invoice.items.map((item) => ({
      ...item,
      estado: estadoDesdeItem(item),
    }));
    const dispatchActual = {
      ...dispatchData,
      invoice: { ...dispatchData.invoice, items },
    };
    set({
      dispatchActual,
      itemActual: dispatchData.nextItem?.itemCode ?? null,
    });
  },

  // Actualiza el store con la respuesta del backend (ScanResult)
  aplicarResultadoEscaneo: (scanResult) => {
    const { dispatchActual } = get();
    if (!dispatchActual) return;

    const { scanned, nextItem, isComplete, progress } = scanResult;

    const items = dispatchActual.invoice.items.map((item) =>
      item.itemCode === scanned.itemCode
        ? {
            ...item,
            ...scanned,
            // Estado derivado de lo que dice el backend sobre este item
            estado: scanned.completed ? ESTADOS_ARTICULO.COMPLETADO : ESTADOS_ARTICULO.PENDIENTE,
          }
        : item
    );

    set({
      dispatchActual: {
        ...dispatchActual,
        progress: progress ?? dispatchActual.progress,
        nextItem: nextItem ?? null,
        invoice: {
          ...dispatchActual.invoice,
          items,
          isFullyPicked: isComplete,
        },
      },
      itemActual: nextItem?.itemCode ?? null,
    });
  },

  marcarFaltante: (itemCode) => {
    const { dispatchActual } = get();
    if (!dispatchActual) return;
    const items = dispatchActual.invoice.items.map((item) =>
      item.itemCode === itemCode ? { ...item, estado: ESTADOS_ARTICULO.FALTANTE } : item
    );
    // Al marcar faltante, avanzar itemActual al siguiente pendiente
    const siguiente = items.find((i) => i.estado === ESTADOS_ARTICULO.PENDIENTE);
    set({
      dispatchActual: { ...dispatchActual, invoice: { ...dispatchActual.invoice, items } },
      itemActual: siguiente?.itemCode ?? null,
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
