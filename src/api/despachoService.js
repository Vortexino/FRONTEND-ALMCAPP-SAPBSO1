import axiosClient from './axiosClient';

// Endpoints del backend propio (sección 8.1 del contexto). El frontend de Despacho
// NO habla directo con SAP Service Layer; el backend ya resuelve esa capa.

export async function startDispatch({ docNum, userId, warehouseId }) {
  const { data } = await axiosClient.post('/dispatch/start', { docNum, userId, warehouseId });
  return data;
}

export async function scanItem({ dispatchId, itemCode }) {
  const { data } = await axiosClient.post('/dispatch/scan', { dispatchId, itemCode });
  return data;
}

export async function finishDispatch({ dispatchId, escaneado, fechaHoraEscaneo, usuarioEscaneo }) {
  const { data } = await axiosClient.post('/dispatch/finish', {
    dispatchId,
    escaneado,
    fechaHoraEscaneo,
    usuarioEscaneo,
  });
  return data;
}

export async function getDispatch(dispatchId) {
  const { data } = await axiosClient.get(`/dispatch/${dispatchId}`);
  return data;
}

// TODO: confirmar con el dueño del backend el endpoint real de listado de documentos
// abiertos. La sección 8.1 del contexto solo define GET /dispatch/:id (estado de UNA
// sesión); no hay un endpoint de listado/búsqueda documentado todavía. Este es un
// placeholder hasta coordinarlo — no inventar la ruta como definitiva.
export async function fetchOpenDocuments(query) {
  const { data } = await axiosClient.get('/dispatch', { params: { search: query } });
  return data;
}
