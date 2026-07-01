import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import EstadoBadge from './EstadoBadge';
import AssignBarcodeModal from '../shared/AssignBarcodeModal';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';
import { C, S, shadow } from '../../constants/theme';

export default function ProductoItem({
  item,
  sugerido,
  onMarcarFaltante,
  onConfirmarVisual,
}) {
  const pendiente    = item.estado === ESTADOS_ARTICULO.PENDIENTE;
  const completado   = item.estado === ESTADOS_ARTICULO.COMPLETADO;
  const faltante     = item.estado === ESTADOS_ARTICULO.FALTANTE;
  const errorEscaneo = item.estado === ESTADOS_ARTICULO.ERROR_ESCANEO;

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  // Refleja localmente si el artículo ya tiene barcode (se actualiza tras asignación exitosa)
  const [tieneBarcode, setTieneBarcode] = useState(!!item.barCode);
  const [loadingVisual, setLoadingVisual] = useState(false);

  const onAsignarSuccess = useCallback((barcode) => {
    setTieneBarcode(true);
    setAssignModalVisible(false);
  }, []);

  const onPresConfirmarVisual = useCallback(() => {
    Alert.alert(
      'Confirmación Visual',
      `¿Confirmar el artículo ${item.itemCode} sin escanear su código de barras?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            if (!onConfirmarVisual) return;
            setLoadingVisual(true);
            await onConfirmarVisual(item.itemCode);
            setLoadingVisual(false);
          },
        },
      ]
    );
  }, [item.itemCode, onConfirmarVisual]);

  return (
    <>
      <View style={[styles.card, shadow.sm, sugerido && styles.cardSugerido, faltante && styles.cardFaltante, errorEscaneo && styles.cardError]}>
        <View style={[styles.acento, { backgroundColor: sugerido ? C.primary : errorEscaneo ? C.danger : faltante ? C.warn : C.border }]} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.codigoRow}>
                {sugerido && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextLabel}>SIGUIENTE</Text>
                  </View>
                )}
                <Text style={[styles.codigo, completado && styles.codigoCompletado]}>
                  {item.itemCode}
                </Text>
              </View>
              {item.barCode && (
                <Text style={styles.barCode}>{item.barCode}</Text>
              )}
              {(item.description || item.itemDescription) && (
                <Text style={styles.descripcion} numberOfLines={1}>
                  {item.description ?? item.itemDescription}
                </Text>
              )}
              {item.binLocation && (
                <View style={styles.ubicacionRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.primaryDim} />
                  <Text style={styles.ubicacion}>{item.binLocation}</Text>
                </View>
              )}
              <EstadoBadge estado={item.estado} />
            </View>

            <View style={styles.contadorWrap}>
              <Text style={[styles.contadorNum, completado && { color: C.success }, faltante && { color: C.warn }]}>
                {item.picked}
              </Text>
              <Text style={styles.contadorSep}>/</Text>
              <Text style={styles.contadorTotal}>{item.quantity}</Text>
            </View>
          </View>

          {/* Botones de acción — solo cuando el artículo está pendiente */}
          {pendiente && (
            <View style={styles.accionesRow}>
              {/* Asignar código de barras */}
              <Pressable
                onPress={() => !tieneBarcode && setAssignModalVisible(true)}
                style={({ pressed }) => [
                  styles.accionBtn,
                  styles.accionBtnAsignar,
                  tieneBarcode && styles.accionBtnDisabled,
                  pressed && !tieneBarcode && { opacity: 0.65 },
                ]}
              >
                <MaterialCommunityIcons
                  name={tieneBarcode ? 'barcode-off' : 'barcode-scan'}
                  size={13}
                  color={tieneBarcode ? C.textMuted : C.primary}
                />
                <Text style={[styles.accionLabel, tieneBarcode && styles.accionLabelDisabled]}>
                  {tieneBarcode ? 'Código asignado' : 'Asignar código'}
                </Text>
              </Pressable>

              {/* Confirmación Visual */}
              <Pressable
                onPress={onPresConfirmarVisual}
                disabled={loadingVisual}
                style={({ pressed }) => [
                  styles.accionBtn,
                  styles.accionBtnVisual,
                  (pressed || loadingVisual) && { opacity: 0.65 },
                ]}
              >
                <MaterialCommunityIcons name="eye-check-outline" size={13} color={C.info} />
                <Text style={styles.accionLabelVisual}>Confirmación Visual</Text>
              </Pressable>
            </View>
          )}

          {/* Marcar faltante */}
          {pendiente && (
            <Pressable
              onPress={() => onMarcarFaltante(item.itemCode)}
              style={({ pressed }) => [styles.faltanteBtn, pressed && { opacity: 0.65 }]}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={13} color={C.warn} />
              <Text style={styles.faltanteBtnLabel}>Marcar como faltante</Text>
            </Pressable>
          )}
        </View>
      </View>

      <AssignBarcodeModal
        visible={assignModalVisible}
        item={item}
        onClose={() => setAssignModalVisible(false)}
        onSuccess={onAsignarSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.surface,
    borderRadius: 14,
    marginHorizontal: S.base,
    marginVertical: 5,
    overflow: 'hidden',
  },
  cardSugerido: {
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  cardFaltante: {
    borderWidth: 1.5,
    borderColor: C.warn,
  },
  cardError: {
    borderWidth: 1.5,
    borderColor: C.danger,
  },
  acento: { width: 4 },
  body: { flex: 1, padding: S.md, gap: S.sm },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  codigoRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs, flexWrap: 'wrap' },
  codigo: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  codigoCompletado: { color: C.textSec, textDecorationLine: 'line-through' },

  nextBadge: {
    backgroundColor: C.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nextLabel: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },

  contadorWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  barCode: { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  descripcion: { fontSize: 12, color: C.textSec },
  ubicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ubicacion: { fontSize: 11, color: C.primaryDim, fontWeight: '600' },

  contadorNum: { fontSize: 22, fontWeight: '700', color: C.primary, letterSpacing: -0.5 },
  contadorSep: { fontSize: 14, color: C.textMuted },
  contadorTotal: { fontSize: 16, fontWeight: '600', color: C.textSec },

  accionesRow: {
    flexDirection: 'row',
    gap: S.xs,
  },
  accionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  accionBtnAsignar: {
    backgroundColor: C.primaryLight,
  },
  accionBtnVisual: {
    backgroundColor: C.infoLight,
  },
  accionBtnDisabled: {
    backgroundColor: C.bg,
  },
  accionLabel: { fontSize: 11, fontWeight: '600', color: C.primary },
  accionLabelDisabled: { color: C.textMuted },
  accionLabelVisual: { fontSize: 11, fontWeight: '600', color: C.info },

  faltanteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.warnLight,
  },
  faltanteBtnLabel: { fontSize: 12, fontWeight: '600', color: C.warn },
});
