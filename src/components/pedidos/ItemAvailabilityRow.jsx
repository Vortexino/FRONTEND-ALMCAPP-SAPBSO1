import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ITEM_AVAILABILITY } from '../../store/pedidosStore';
import AssignBarcodeModal from '../shared/AssignBarcodeModal';
import { C, S, shadow } from '../../constants/theme';

const AVAIL_CFG = {
  [ITEM_AVAILABILITY.PENDING]:        { label: 'Pendiente',  icon: 'clock-outline',   color: C.textSec, bg: C.bg },
  [ITEM_AVAILABILITY.AVAILABLE]:      { label: 'Disponible', icon: 'check-circle',    color: C.success, bg: C.successLight },
  [ITEM_AVAILABILITY.NEEDS_TRANSFER]: { label: 'Traslado',   icon: 'swap-horizontal', color: C.warn,    bg: C.warnLight },
  [ITEM_AVAILABILITY.UNAVAILABLE]:    { label: 'Sin stock',  icon: 'close-circle',    color: C.danger,  bg: C.dangerLight },
};

const OPCIONES = [
  { value: ITEM_AVAILABILITY.AVAILABLE,      label: 'Disponible', icon: 'check',           color: C.success, bg: C.successLight },
  { value: ITEM_AVAILABILITY.NEEDS_TRANSFER, label: 'Traslado',   icon: 'swap-horizontal', color: C.warn,    bg: C.warnLight },
  { value: ITEM_AVAILABILITY.UNAVAILABLE,    label: 'Sin stock',  icon: 'close',           color: C.danger,  bg: C.dangerLight },
];

export default function ItemAvailabilityRow({ item, onUpdate, disabled, sugerido }) {
  const [note, setNote] = useState(item.transferNote ?? '');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [tieneBarcode, setTieneBarcode] = useState(!!item.barCode);
  const [loadingVisual, setLoadingVisual] = useState(false);

  // Sync note when the store updates the item
  useEffect(() => {
    setNote(item.transferNote ?? '');
  }, [item.transferNote]);

  // Estado visual derivado directamente del store — sin estado local "selected"
  const availability = item.availability ?? ITEM_AVAILABILITY.PENDING;
  const pendiente  = availability === ITEM_AVAILABILITY.PENDING;
  const disponible = availability === ITEM_AVAILABILITY.AVAILABLE;
  const traslado   = availability === ITEM_AVAILABILITY.NEEDS_TRANSFER;
  const sinStock   = availability === ITEM_AVAILABILITY.UNAVAILABLE;

  const cfg = AVAIL_CFG[availability] ?? AVAIL_CFG[ITEM_AVAILABILITY.PENDING];

  const acentoColor = sugerido   ? C.primary
    : disponible ? C.success
    : traslado   ? C.warn
    : sinStock   ? C.danger
    : C.border;

  const scanned = item.scannedQty ?? 0;
  const contadorVerde = item.quantity > 0 && scanned >= item.quantity;

  const onSeleccionar = (valor) => {
    if (disabled) return;
    onUpdate(item.lineNum, { availability: valor, transferNote: note });
  };

  const onGuardarNota = () => {
    if (!traslado) return;
    onUpdate(item.lineNum, { availability: ITEM_AVAILABILITY.NEEDS_TRANSFER, transferNote: note });
  };

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

  return (
    <>
      <View style={[
        styles.card, shadow.sm,
        sugerido && styles.cardSugerido,
        sinStock && !sugerido && styles.cardSinStock,
      ]}>
        {/* Wrapper interior con overflow:hidden para clipear el acento a los bordes redondeados.
            Separado del card exterior para evitar bug de Android donde overflow:hidden + elevation
            + cambios dinámicos de hijos deja la tarjeta en blanco. */}
        <View style={styles.cardClip}>
        <View style={[styles.acento, { backgroundColor: acentoColor }]} />

        <View style={styles.body}>
          {/* Fila superior: info del artículo + contador */}
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
              {/* Badge driven directamente por item.availability del store */}
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

          {/* Stock SAP — info de referencia */}
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

          {/* Asignar código + Confirmación Visual — solo cuando pendiente */}
          {pendiente ? (
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
                <MaterialCommunityIcons name="eye-check-outline" size={13} color={C.info} />
                <Text style={styles.accionLabelVisual}>Confirmación Visual</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Botones de disponibilidad — activo driven por item.availability del store */}
          <View style={styles.optsRow}>
            {OPCIONES.map((opt) => {
              const active = availability === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onSeleccionar(opt.value)}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.optBtn,
                    active && [styles.optBtnActive, { backgroundColor: opt.bg, borderColor: opt.color }],
                    pressed && !disabled && { opacity: 0.75 },
                    disabled && { opacity: 0.45 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={14}
                    color={active ? opt.color : C.textSec}
                  />
                  <Text style={[styles.optLabel, active && { color: opt.color, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {traslado ? (
            <View style={styles.notaFila}>
              <TextInput
                style={styles.notaInput}
                mode="outlined"
                dense
                placeholder="Nota de traslado (opcional)"
                value={note}
                onChangeText={setNote}
                onEndEditing={onGuardarNota}
                disabled={disabled}
                outlineStyle={{ borderRadius: 8 }}
                activeOutlineColor={C.primary}
                outlineColor={C.border}
              />
            </View>
          ) : null}
        </View>
        </View>{/* cierre cardClip */}
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
  // Tarjeta — idéntica a ProductoItem de Despacho
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
  cardSinStock: { borderWidth: 1.5, borderColor: C.danger },
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
    paddingVertical: 5,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  accionBtnAsignar: { backgroundColor: C.primaryLight },
  accionBtnVisual:  { backgroundColor: C.infoLight },
  accionBtnDisabled: { backgroundColor: C.bg },
  accionLabel: { fontSize: 11, fontWeight: '600', color: C.primary },
  accionLabelDisabled: { color: C.textMuted },
  accionLabelVisual: { fontSize: 11, fontWeight: '600', color: C.info },

  optsRow: { flexDirection: 'row', gap: S.xs },
  optBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  optBtnActive: { borderWidth: 1.5 },
  optLabel: { fontSize: 11, fontWeight: '600', color: C.textSec },

  notaFila: { marginTop: 4 },
  notaInput: { backgroundColor: C.surface },
});
