import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { usePedidos } from '../../hooks/usePedidos';
import ItemAvailabilityRow from '../../components/pedidos/ItemAvailabilityRow';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import HidScannerInput from '../../components/shared/HidScannerInput';
import { ITEM_AVAILABILITY, ORDER_STATUS } from '../../store/pedidosStore';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

export default function PedidosReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params ?? {};
  const { orderActual, estadoUI, user, fetchOrder, escanearItem, actualizarItem, confirmarPedido, rechazarPedido } =
    usePedidos();
  const [actionLoading, setActionLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const hidRef = useRef(null);

  // Vuelve a enfocar el scanner HID cuando se cierra el modal de cámara
  useEffect(() => {
    if (!scannerVisible) {
      setTimeout(() => hidRef.current?.focus(), 150);
    }
  }, [scannerVisible]);

  useEffect(() => {
    if (!orderActual) fetchOrder(orderId);
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hayPendientes = orderActual?.items?.some(
    (i) => i.availability === ITEM_AVAILABILITY.PENDING
  );

  const onActualizar = useCallback(
    async (lineNum, cambios) => {
      const res = await actualizarItem(orderId, lineNum, cambios);
      if (!res.ok) Toast.show({ type: 'error', text1: res.error });
    },
    [orderId, actualizarItem]
  );

  // Escaneo de código de barras → POST /orders/:id/items/scan
  const onCodigoEscaneado = useCallback(
    async (codigo) => {
      setScannerVisible(false);
      setScanLoading(true);
      const res = await escanearItem(orderId, codigo);
      setScanLoading(false);
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'Artículo escaneado y actualizado.' });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({ type: 'error', text1: res.error });
      }
    },
    [orderId, escanearItem]
  );

  const onConfirmar = useCallback(async () => {
    setActionLoading(true);
    const res = await confirmarPedido(orderId);
    setActionLoading(false);
    if (res.ok) {
      Toast.show({ type: 'success', text1: 'Orden confirmada correctamente.' });
      navigation.pop(2);
    } else {
      Toast.show({ type: 'error', text1: res.error });
    }
  }, [orderId, confirmarPedido, navigation]);

  const onRechazar = useCallback(() => {
    Alert.alert(
      'Rechazar orden',
      '¿Estás seguro de que querés rechazar esta orden? No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const res = await rechazarPedido(orderId);
            setActionLoading(false);
            if (res.ok) {
              Toast.show({ type: 'info', text1: 'Orden rechazada.' });
              navigation.pop(2);
            } else {
              Toast.show({ type: 'error', text1: res.error });
            }
          },
        },
      ]
    );
  }, [orderId, rechazarPedido, navigation]);

  if (!orderActual && estadoUI.loading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!orderActual) return null;

  // Solo el dueño del lock puede confirmar o rechazar (backend valida con 409).
  const lock = orderActual?.lock;
  const lockOwner = lock?.lockedBy ?? lock?.userId ?? lock?.user_id ?? lock?.user ?? orderActual?.reviewed_by;
  const esMiLock = !!lockOwner && lockOwner === user?.userId;

  const puedeConfirmar =
    esMiLock &&
    !hayPendientes &&
    orderActual.status !== ORDER_STATUS.CONFIRMED &&
    orderActual.status !== ORDER_STATUS.REJECTED;

  const revisados = orderActual.items?.filter((i) => i.availability !== ITEM_AVAILABILITY.PENDING).length ?? 0;
  const total = orderActual.items?.length ?? 0;
  const pct = total > 0 ? revisados / total : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTop}>
          <View>
            <Text style={styles.docNum}>Orden #{orderActual.docNum}</Text>
            <Text style={styles.cliente}>{orderActual.cardName}</Text>
          </View>
          <View style={styles.progresoBadge}>
            <Text style={styles.progresoNum}>{revisados}</Text>
            <Text style={styles.progresoSep}>/</Text>
            <Text style={styles.progresoTotal}>{total}</Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.barraWrap}>
          <View style={[styles.barraFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>

        {hayPendientes && (
          <View style={styles.avisoPendiente}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={C.warn} />
            <Text style={styles.avisoTexto}>
              {total - revisados} artículo(s) sin clasificar · escaneá o clasificá manualmente
            </Text>
          </View>
        )}

        {/* Botón escanear */}
        <Pressable
          onPress={() => setScannerVisible(true)}
          disabled={scanLoading}
          style={({ pressed }) => [
            styles.btnScan,
            (pressed || scanLoading) && { opacity: 0.75 },
          ]}
        >
          {scanLoading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <MaterialCommunityIcons name="barcode-scan" size={16} color={C.primary} />
          )}
          <Text style={styles.btnScanLabel}>
            {scanLoading ? 'Consultando stock…' : 'Escanear artículo'}
          </Text>
        </Pressable>
      </View>

      {estadoUI.error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={13} color={C.danger} />
          <Text style={styles.errorText}>{estadoUI.error}</Text>
        </View>
      )}

      <FlatList
        data={orderActual.items}
        keyExtractor={(item) => String(item.lineNum)}
        renderItem={({ item }) => (
          <ItemAvailabilityRow item={item} onUpdate={onActualizar} disabled={actionLoading || scanLoading} />
        )}
        contentContainerStyle={styles.lista}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={onConfirmar}
          disabled={!puedeConfirmar || actionLoading}
          style={({ pressed }) => [
            styles.btnConfirmar,
            (!puedeConfirmar || actionLoading) && { opacity: 0.45 },
            pressed && puedeConfirmar && { opacity: 0.8 },
          ]}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
          )}
          <Text style={styles.btnConfirmarLabel}>Confirmar orden</Text>
        </Pressable>

        <Pressable
          onPress={onRechazar}
          disabled={actionLoading || !esMiLock}
          style={({ pressed }) => [
            styles.btnRechazar,
            (actionLoading || !esMiLock) && { opacity: 0.45 },
            pressed && { opacity: 0.75 },
          ]}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={16} color={C.danger} />
          <Text style={styles.btnRechazarLabel}>Rechazar</Text>
        </Pressable>
      </View>

      {/* Scanner HID: siempre activo en pantalla para scanners físicos Bluetooth/USB */}
      <HidScannerInput inputRef={hidRef} onScanned={onCodigoEscaneado} />

      <BarcodeScannerView
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={onCodigoEscaneado}
        title="Escanea el código del artículo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  encabezado: {
    backgroundColor: C.surface,
    padding: S.base,
    gap: S.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  encabezadoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docNum: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  cliente: { fontSize: 13, color: C.textSec, marginTop: 2 },

  progresoBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  progresoNum: { fontSize: 22, fontWeight: '700', color: C.primary, letterSpacing: -0.5 },
  progresoSep: { fontSize: 13, color: C.textMuted },
  progresoTotal: { fontSize: 15, fontWeight: '600', color: C.textSec },

  barraWrap: { height: 4, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  barraFill: { height: 4, backgroundColor: C.primary, borderRadius: 4 },

  avisoPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.warnLight,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  avisoTexto: { fontSize: 12, color: C.warn, fontWeight: '600', flex: 1 },

  btnScan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.xs,
    paddingVertical: 9,
    paddingHorizontal: S.md,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primary + '40',
  },
  btnScanLabel: { fontSize: 13, fontWeight: '700', color: C.primary },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    margin: S.base,
    padding: S.md,
    backgroundColor: C.dangerLight,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, color: C.danger },

  lista: { paddingTop: S.sm, paddingBottom: S.sm },

  footer: {
    padding: S.base,
    gap: S.sm,
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  btnConfirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.success,
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnConfirmarLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },

  btnRechazar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.danger,
  },
  btnRechazarLabel: { color: C.danger, fontWeight: '700', fontSize: 14 },
});
