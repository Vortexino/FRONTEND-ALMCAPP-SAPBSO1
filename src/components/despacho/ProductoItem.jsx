import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AssignBarcodeModal from '../shared/AssignBarcodeModal';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';
import { C, S, shadow } from '../../constants/theme';

const ESTADO_CFG = {
  [ESTADOS_ARTICULO.PENDIENTE]:     { label: 'Pendiente', icon: 'clock-outline',  color: C.textSec, bg: C.bg },
  [ESTADOS_ARTICULO.COMPLETADO]:    { label: 'Listo',     icon: 'check-circle',   color: C.success, bg: C.successLight },
  [ESTADOS_ARTICULO.FALTANTE]:      { label: 'Faltante',  icon: 'alert-circle',   color: C.warn,    bg: C.warnLight },
  [ESTADOS_ARTICULO.ERROR_ESCANEO]: { label: 'Error',     icon: 'close-circle',   color: C.danger,  bg: C.dangerLight },
};

export default function ProductoItem({
  item,
  sugerido,
  disabled,
  onConfirmarVisual,
  onDeshacer,
}) {
  const pendiente    = item.estado === ESTADOS_ARTICULO.PENDIENTE;
  const completado   = item.estado === ESTADOS_ARTICULO.COMPLETADO;
  const faltante     = item.estado === ESTADOS_ARTICULO.FALTANTE;
  const errorEscaneo = item.estado === ESTADOS_ARTICULO.ERROR_ESCANEO;

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [tieneBarcode, setTieneBarcode] = useState(!!item.barCode);
  const [loadingVisual, setLoadingVisual] = useState(false);

  const cfg = ESTADO_CFG[item.estado] ?? ESTADO_CFG[ESTADOS_ARTICULO.PENDIENTE];

  const acentoColor = sugerido    ? C.primary
    : completado  ? C.success
    : errorEscaneo? C.danger
    : faltante    ? C.warn
    : C.border;

  const contadorVerde = completado;

  const onAsignarSuccess = useCallback(() => {
    setTieneBarcode(true);
    setAssignModalVisible(false);
  }, []);

  const onPresConfirmarVisual = useCallback(() => {
    Alert.alert(
      'Confirmación Visual',
      `¿Marcar ${item.itemCode} como listo sin escanear su código de barras?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, marcar listo',
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
      <View style={[
        styles.card,
        shadow.sm,
        sugerido && styles.cardSugerido,
        errorEscaneo && styles.cardError,
        faltante && !sugerido && styles.cardFaltante,
      ]}>
        <View style={styles.cardClip}>
          <View style={[styles.acento, { backgroundColor: acentoColor }]} />

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
                {item.barCode ? (
                  <Text style={styles.barCode}>{item.barCode}</Text>
                ) : null}
                {(item.description || item.itemDescription) ? (
                  <Text style={styles.descripcion} numberOfLines={1}>
                    {item.description ?? item.itemDescription}
                  </Text>
                ) : null}
                {item.binLocation ? (
                  <View style={styles.ubicacionRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.primaryDim} />
                    <Text style={styles.ubicacion}>{item.binLocation}</Text>
                  </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
                  <Text style={[styles.badgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.contadorWrap}>
                <Text style={[styles.contadorNum, contadorVerde && { color: C.success }]}>
                  {item.picked}
                </Text>
                <Text style={styles.contadorSep}>/</Text>
                <Text style={styles.contadorTotal}>{item.quantity}</Text>
              </View>
            </View>

            {pendiente && (
              <View style={styles.accionesRow}>
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

                <Pressable
                  onPress={onPresConfirmarVisual}
                  disabled={loadingVisual || disabled}
                  style={({ pressed }) => [
                    styles.accionBtn,
                    styles.accionBtnVisual,
                    (pressed || loadingVisual || disabled) && { opacity: 0.65 },
                  ]}
                >
                  {loadingVisual
                    ? <ActivityIndicator size={13} color={C.info} />
                    : <MaterialCommunityIcons name="eye-check-outline" size={13} color={C.info} />}
                  <Text style={styles.accionLabelVisual}>Visual</Text>
                </Pressable>
              </View>
            )}

            {completado && onDeshacer && (
              <Pressable
                onPress={() => onDeshacer(item.itemCode)}
                disabled={disabled}
                style={({ pressed }) => [styles.deshacerBtn, (pressed || disabled) && { opacity: 0.65 }]}
              >
                <MaterialCommunityIcons name="undo-variant" size={13} color={C.textSec} />
                <Text style={styles.deshacerLabel}>Deshacer</Text>
              </Pressable>
            )}
          </View>
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
    backgroundColor: C.surface,
    borderRadius: 14,
    marginHorizontal: S.base,
    marginVertical: 5,
  },
  cardClip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardSugerido: { borderWidth: 1.5, borderColor: C.primary },
  cardFaltante:  { borderWidth: 1.5, borderColor: C.warn },
  cardError:     { borderWidth: 1.5, borderColor: C.danger },
  acento: { width: 4 },
  body: { flex: 1, padding: S.md, gap: S.sm },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  codigoRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs, flexWrap: 'wrap' },
  codigo: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  codigoCompletado: { color: C.textSec, textDecorationLine: 'line-through' },
  nextBadge: { backgroundColor: C.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  nextLabel: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  barCode: { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  descripcion: { fontSize: 12, color: C.textSec },
  ubicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ubicacion: { fontSize: 11, color: C.primaryDim, fontWeight: '600' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  contadorWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  contadorNum: { fontSize: 22, fontWeight: '700', color: C.primary, letterSpacing: -0.5 },
  contadorSep: { fontSize: 14, color: C.textMuted },
  contadorTotal: { fontSize: 16, fontWeight: '600', color: C.textSec },

  accionesRow: { flexDirection: 'row', gap: S.xs },
  accionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  accionBtnAsignar:  { backgroundColor: C.primaryLight },
  accionBtnVisual:   { backgroundColor: C.infoLight },
  accionBtnDisabled: { backgroundColor: C.bg },
  accionLabel:         { fontSize: 11, fontWeight: '600', color: C.primary },
  accionLabelDisabled: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  accionLabelVisual:   { fontSize: 11, fontWeight: '600', color: C.info },

  deshacerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  deshacerLabel: { fontSize: 11, fontWeight: '600', color: C.textSec },
});
