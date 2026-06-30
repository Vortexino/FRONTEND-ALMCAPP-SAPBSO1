import { useCallback, useState } from 'react';
import * as itemsService from '../api/itemsService';

function obtenerMensajeError(error) {
  return error.response?.data?.error || 'No se pudo conectar con el servidor. Verifica tu conexión.';
}

export function useItemBarcode() {
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sugerencias, setSugerencias] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const limpiar = useCallback(() => {
    setResultado(null);
    setError(null);
  }, []);

  const limpiarSugerencias = useCallback(() => {
    setSugerencias([]);
  }, []);

  const buscar = useCallback(async (codigo) => {
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const item = await itemsService.lookupItem(codigo);
      setResultado(item);
      return { ok: true, item };
    } catch (e) {
      const mensaje = obtenerMensajeError(e);
      setError(mensaje);
      return { ok: false, mensaje };
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarArticulos = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSugerencias([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const items = await itemsService.searchItems(query);
      setSugerencias(items || []);
    } catch {
      setSugerencias([]);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const asociar = useCallback(async (itemCode, barcode) => {
    setLoading(true);
    setError(null);
    try {
      const item = await itemsService.assignBarcode(itemCode, barcode);
      return { ok: true, item };
    } catch (e) {
      const mensaje = obtenerMensajeError(e);
      setError(mensaje);
      return { ok: false, mensaje };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    resultado, loading, error,
    sugerencias, loadingSearch,
    buscar, buscarArticulos, asociar,
    limpiar, limpiarSugerencias,
  };
}
