import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ITEM_AVAILABILITY } from '../../store/pedidosStore';
import AssignBarcodeModal from '../shared/AssignBarcodeModal';
import { C, S, shadow } from '../../constants/theme';

const AVAIL_CFG = {
  [ITEM_AVAILABILITY.PENDING]:     { label: 'Pendiente',  icon: 'clock-outline',          color: C.textSec, bg: C.bg },
  [ITEM_AVAILABILITY.AVAILABLE]:   { label: 'Disponible', icon: 'check-circle',            color: C.success, bg: C.successLight },
  [ITEM_AVAILABILITY.UNAVAILABLE]: { label: 'Faltante',   icon: 'package-variant-remove',  color: C.danger,  bg: C.dangerLight },
  [ITEM_AVAILABILITY.NEEDS_TRANSFER]: { label: 'Traslado', icon: 'swap-horizontal',        color: C.warn,    bg: C.warnLight },
};

export default function ItemAvailabilityRow({ item, onUpdate, disabled, sugerido }) {
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [tieneBarcode, setTieneBarcode] = useState(!!item.barCode);
  const [loadingVisual, setLoadingVisual] = useState(false);

  const availability = item.availability ?? ITEM_AVAILABILITY.PENDING;
  const pendiente  = availability === ITEM_AVAILABILITY.PENDING;
  const disponible = availability === ITEM_AVAILABILITY.AVAILABLE;
  const faltante   = availability === ITEM_AVAILABILITY.UNAVAILABLE;
  // Siempre mostrar acciones — cada estado permite cambiar a los otros
  const mostrarFaltante = pendiente || disponible;   // faltante aún no está → lo puede marcar
  const mostrarVisual   = pendiente || faltante;     // no está disponible aún → puede confirmar
  const mostrarAsignar  = pendiente || faltante;     // no escaneado aún → puede asignar código

  const cfg = AVAIL_CFG[availability] ?? AVAIL_CFG[ITEM_AVAILABILITY.PENDING];

  const acentoColor = sugerido   ? C.primary
    : disponible ? C.success
    : faltante   ? C.danger
    : C.border;

  const scanned = item.scannedQty ?? 0;
  const contadorVerde = item.quantity > 0 && scanned >= item.quantity;

  const onAsignarSuccess = useCallback(() => {
    setTieneBarcode(true);
    setAssignModalVisible(false);
  }, []);

  const onPresConfirmarVisual = useCallback(() => {
    Alert.alert(
      'Confirmación Visual',
      `¿Marcar ${item.itemCode} como Disponible sin escanear su código de barras?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, marcar disponible',
          onPress: async () => {
            setLoadingVisual(true);
            await onUpdate(item.lineNum, { availability: ITEM_AVAILABILITY.AVAILABLE });
            setLoadingVisual(false);
          },
        },
      ]
    );
  }, [item.itemCode, item.lineNum, onUpdate]);

  const onPresFaltante = useCallback(() => {
    Alert.alert(
      'Marcar como Faltante',
      `¿El artículo ${item.itemCode} no está disponible en el almacén?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, marcar faltante',
          style: 'destructive',
          onPress: () => onUpdate(item.lineNum, { availability: ITEM_AVAILABILITY.UNAVAILABLE }),
        },
      ]
    );
  }, [item.itemCode, item.lineNum, onUpdate]);

  return (
    <>
      <View style={[
        styles.card,
        shadow.sm,
        sugerido && styles.cardSugerido,
        faltante && !sugerido && styles.cardFaltante,
      ]}>
        <View style={styles.cardClip}>
          <View style={[styles.acento, { backgroundColor: acentoColor }]} />

          <View style={styles.body}>
            {/* Fila superior: info + contador */}
            <View style={styles.topRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.codigoRow}>
                  {sugerido && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextLabel}>SIGUIENTE</Text>
                    </View>
                  )}
                  <Text style={styles.codigo}>{item.itemCode}</Text>
                </View>
                {(tieneBarcode && item.barCode) ? (
                  <Text style={styles.barCode}>{item.barCode}</Text>
                ) : null}
                {item.itemDescription ? (
                  <Text style={styles.descripcion} numberOfLines={1}>{item.itemDescription}</Text>
                ) : null}
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
                  <Text style={[styles.badgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.contadorWrap}>
                <Text style={[styles.contadorNum, contadorVerde && { color: C.success }]}>
                  {scanned}
                </Text>
                <Text style={styles.contadorSep}>/</Text>
                <Text style={styles.contadorTotal}>{item.quantity}</Text>
              </View>
            </View>

            {/* Stock SAP */}
            {(item.sapStock != null || item.netAvailable != null) ? (
              <View style={styles.stockRow}>
                {item.sapStock != null && (
                  <Text style={styles.stockLabel}>
                    Stock SAP: <Text style={styles.stockVal}>{item.sapStock}</Text>
                  </Text>
                )}
                {item.netAvailable != null && (
                  <Text style={styles.stockLabel}>
                    Neto: <Text style={styles.stockVal}>{item.netAvailable}</Text>
                  </Text>
                )}
              </View>
            ) : null}

            {/* Acciones — siempre visibles para permitir correcciones en cualquier estado */}
            <View style={styles.accionesRow}>
              {mostrarAsignar && (
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
              )}

              {mostrarVisual && (
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
              )}

              {mostrarFaltante && (
                <Pressable
                  onPress={onPresFaltante}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.accionBtn,
                    styles.accionBtnFaltante,
                    (pressed || disabled) && { opacity: 0.65 },
                  ]}
                >
                  <MaterialCommunityIcons name="package-variant-remove" size={13} color={C.danger} />
                  <Text style={styles.accionLabelFaltante}>Faltante</Text>
                </Pressable>
              )}
            </View>
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
  cardFaltante: { borderWidth: 1.5, borderColor: C.danger },
  acento: { width: 4 },
  body: { flex: 1, padding: S.md, gap: S.sm },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  codigoRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs, flexWrap: 'wrap' },
  codigo: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  nextBadge: { backgroundColor: C.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  nextLabel: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  barCode: { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  descripcion: { fontSize: 12, color: C.textSec },

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

  stockRow: { flexDirection: 'row', gap: S.md },
  stockLabel: { fontSize: 11, color: C.textMuted },
  stockVal: { fontWeight: '600', color: C.text },

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
  accionBtnFaltante: { backgroundColor: C.dangerLight },
  accionBtnDisabled: { backgroundColor: C.bg },
  accionLabel:         { fontSize: 11, fontWeight: '600', color: C.primary },
  accionLabelDisabled: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  accionLabelVisual:   { fontSize: 11, fontWeight: '600', color: C.info },
  accionLabelFaltante: { fontSize: 11, fontWeight: '600', color: C.danger },
});
