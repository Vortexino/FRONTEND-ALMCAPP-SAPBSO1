import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useItemBarcode } from '../../hooks/useItemBarcode';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import { C, S, shadow } from '../../constants/theme';

export default function ItemBarcodeScreen() {
  const {
    resultado, loading, error,
    sugerencias, loadingSearch,
    buscar, buscarArticulos, asociar,
    limpiar, limpiarSugerencias,
  } = useItemBarcode();

  // Sección: identificar
  const [codigoBuscado, setCodigoBuscado] = useState('');

  // Sección: asociar
  const [busquedaDescripcion, setBusquedaDescripcion] = useState('');
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [nuevoBarcode, setNuevoBarcode] = useState('');

  // 'buscar' | 'barcode' — a qué campo va el próximo escaneo
  const [scannerTarget, setScannerTarget] = useState(null);

  const debounceRef = useRef(null);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const onScanned = useCallback(
    (codigo) => {
      if (scannerTarget === 'buscar') setCodigoBuscado(codigo);
      if (scannerTarget === 'barcode') setNuevoBarcode(codigo);
      setScannerTarget(null);
    },
    [scannerTarget]
  );

  const onBuscar = useCallback(async () => {
    const codigo = codigoBuscado.trim();
    if (!codigo) return;
    await buscar(codigo);
  }, [codigoBuscado, buscar]);

  const onDescripcionChange = useCallback(
    (text) => {
      setBusquedaDescripcion(text);
      setItemSeleccionado(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length >= 2) {
        debounceRef.current = setTimeout(() => buscarArticulos(text.trim()), 400);
      } else {
        limpiarSugerencias();
      }
    },
    [buscarArticulos, limpiarSugerencias]
  );

  const seleccionarArticulo = useCallback(
    (item) => {
      setItemSeleccionado(item);
      setBusquedaDescripcion('');
      limpiarSugerencias();
    },
    [limpiarSugerencias]
  );

  const limpiarSeleccion = useCallback(() => {
    setItemSeleccionado(null);
    setBusquedaDescripcion('');
    limpiarSugerencias();
  }, [limpiarSugerencias]);

  const onAsociar = useCallback(async () => {
    if (!itemSeleccionado || !nuevoBarcode.trim()) return;
    const res = await asociar(itemSeleccionado.itemCode, nuevoBarcode.trim());
    if (res.ok) {
      Toast.show({ type: 'success', text1: `Código ${nuevoBarcode.trim()} asociado a ${itemSeleccionado.itemCode}` });
      setItemSeleccionado(null);
      setNuevoBarcode('');
      limpiarSugerencias();
    } else {
      Toast.show({ type: 'error', text1: res.mensaje });
    }
  }, [itemSeleccionado, nuevoBarcode, asociar, limpiarSugerencias]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Identificar ─────────────────────────────────────── */}
      <Text style={styles.seccionLabel}>IDENTIFICAR CÓDIGO DE BARRAS</Text>
      <View style={[styles.card, shadow.sm]}>
        <Text style={styles.cardHint}>
          Escanea o escribe un código para ver a qué artículo corresponde en SAP.
        </Text>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            mode="outlined"
            placeholder="Código de barras o ItemCode"
            value={codigoBuscado}
            onChangeText={(t) => { setCodigoBuscado(t); limpiar(); }}
            onSubmitEditing={onBuscar}
            returnKeyType="search"
            outlineStyle={{ borderRadius: 12 }}
            activeOutlineColor={C.primary}
            outlineColor={C.border}
          />
          <Button
            mode="contained-tonal"
            icon="barcode-scan"
            onPress={() => setScannerTarget('buscar')}
            style={styles.scanBtn}
            contentStyle={styles.scanBtnContent}
          >
            {''}
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={onBuscar}
          loading={loading}
          disabled={loading || !codigoBuscado.trim()}
        >
          Buscar
        </Button>

        {error && (
          <View style={styles.resultadoError}>
            <MaterialCommunityIcons name="close-circle" size={18} color={C.danger} />
            <Text style={styles.resultadoErrorTexto}>{error}</Text>
          </View>
        )}

        {resultado && (
          <View style={styles.resultadoOk}>
            <MaterialCommunityIcons name="check-circle" size={18} color={C.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resultadoItemCode}>{resultado.itemCode}</Text>
              {resultado.description && (
                <Text style={styles.resultadoDesc}>{resultado.description}</Text>
              )}
              <Text style={styles.resultadoBarcode}>
                {resultado.barCode
                  ? `Código de barras: ${resultado.barCode}`
                  : 'Sin código de barras asignado'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Asociar ──────────────────────────────────────────── */}
      <Text style={[styles.seccionLabel, { marginTop: S.xl }]}>ASOCIAR CÓDIGO A UN ARTÍCULO</Text>
      <View style={[styles.card, shadow.sm]}>
        <Text style={styles.cardHint}>
          Vincula un código de barras físico a un artículo existente en SAP.
        </Text>

        <Text style={styles.fieldLabel}>Artículo</Text>

        {itemSeleccionado ? (
          <View style={styles.itemSeleccionadoChip}>
            <MaterialCommunityIcons name="check-circle" size={16} color={C.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chipItemCode}>{itemSeleccionado.itemCode}</Text>
              {itemSeleccionado.description ? (
                <Text style={styles.chipDesc} numberOfLines={1}>
                  {itemSeleccionado.description}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={limpiarSeleccion} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={20} color={C.textMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={[styles.input, { width: '100%' }]}
              mode="outlined"
              placeholder="Escribe la descripción del artículo..."
              value={busquedaDescripcion}
              onChangeText={onDescripcionChange}
              outlineStyle={{ borderRadius: 12 }}
              activeOutlineColor={C.primary}
              outlineColor={C.border}
              right={
                loadingSearch
                  ? <TextInput.Icon
                      icon={() => <ActivityIndicator size={16} color={C.textMuted} />}
                    />
                  : null
              }
            />

            {sugerencias.length > 0 && (
              <View style={styles.sugerenciasLista}>
                {sugerencias.map((item, idx) => (
                  <Pressable
                    key={item.itemCode}
                    onPress={() => seleccionarArticulo(item)}
                    style={({ pressed }) => [
                      styles.sugerenciaRow,
                      pressed && styles.sugerenciaRowPressed,
                      idx < sugerencias.length - 1 && styles.sugerenciaRowBorder,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sugerenciaDesc} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={styles.sugerenciaCode}>{item.itemCode}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={C.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}

            {busquedaDescripcion.trim().length >= 2 &&
              !loadingSearch &&
              sugerencias.length === 0 && (
                <Text style={styles.sinResultados}>
                  Sin resultados para "{busquedaDescripcion}"
                </Text>
              )}
          </>
        )}

        <Text style={styles.fieldLabel}>Nuevo código de barras</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            mode="outlined"
            placeholder="Escanea o escribe el código"
            value={nuevoBarcode}
            onChangeText={setNuevoBarcode}
            outlineStyle={{ borderRadius: 12 }}
            activeOutlineColor={C.primary}
            outlineColor={C.border}
          />
          <Button
            mode="contained-tonal"
            icon="barcode-scan"
            onPress={() => setScannerTarget('barcode')}
            style={styles.scanBtn}
            contentStyle={styles.scanBtnContent}
          >
            {''}
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={onAsociar}
          loading={loading}
          disabled={loading || !itemSeleccionado || !nuevoBarcode.trim()}
        >
          Asociar
        </Button>
      </View>

      <BarcodeScannerView
        visible={scannerTarget !== null}
        onClose={() => setScannerTarget(null)}
        onScanned={onScanned}
        title="Escanea el código"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.base, paddingBottom: S.xxxl, gap: S.sm },

  seccionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: S.sm,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: S.base,
    gap: S.md,
  },
  cardHint: { fontSize: 13, color: C.textSec, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSec, marginTop: -S.xs },

  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  input: { flex: 1, backgroundColor: C.surface, height: 48 },
  scanBtn: { borderRadius: 12 },
  scanBtnContent: { width: 36, height: 36 },

  // Identificar resultados
  resultadoOk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.sm,
    backgroundColor: C.successLight,
    borderRadius: 12,
    padding: S.md,
  },
  resultadoItemCode: { fontSize: 16, fontWeight: '700', color: C.text },
  resultadoDesc: { fontSize: 13, color: C.textSec, marginTop: 2 },
  resultadoBarcode: { fontSize: 12, color: C.textMuted, marginTop: 4 },
  resultadoError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.dangerLight,
    borderRadius: 12,
    padding: S.md,
  },
  resultadoErrorTexto: { flex: 1, fontSize: 13, color: C.danger },

  // Artículo seleccionado (chip)
  itemSeleccionadoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.successLight,
    borderRadius: 12,
    padding: S.md,
  },
  chipItemCode: { fontSize: 14, fontWeight: '700', color: C.text },
  chipDesc: { fontSize: 12, color: C.textSec, marginTop: 2 },

  // Autocomplete
  sugerenciasLista: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginTop: -S.xs,
  },
  sugerenciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    paddingHorizontal: S.base,
    backgroundColor: C.surface,
  },
  sugerenciaRowPressed: { backgroundColor: C.primaryLight },
  sugerenciaRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  sugerenciaDesc: { fontSize: 14, color: C.text, fontWeight: '500' },
  sugerenciaCode: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  sinResultados: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: S.xs },
});
