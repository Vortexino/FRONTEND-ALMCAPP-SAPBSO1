import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useDespacho } from '../../hooks/useDespacho';
import ProductoItem from '../../components/despacho/ProductoItem';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import HidScannerInput from '../../components/shared/HidScannerInput';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

const MENSAJES_RESULTADO = {
  no_pertenece: 'Código no corresponde a ningún artículo de este documento.',
  ya_completado: 'Este artículo ya fue completado.',
};

export default function DespachoDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { docNum } = route.params ?? {};
  const { dispatchActual, itemActual, estadoUI, user, todosRevisados, iniciarDespacho, escanearArticulo, marcarFaltante, cancelarDespacho, resetDispatch } = useDespacho();
  const [scannerVisible, setScannerVisible] = useState(false);
  const hidRef = useRef(null);

  // Vuelve a enfocar el scanner HID cuando se cierra el modal de cámara
  useEffect(() => {
    if (!scannerVisible) {
      setTimeout(() => hidRef.current?.focus(), 150);
    }
  }, [scannerVisible]);

  const soyResponsable = dispatchActual?.userId === user?.userId;

  const onCancelar = useCallback(() => {
    Alert.alert(
      'Cancelar despacho',
      '¿Seguro que querés cancelar? Se perderá el progreso actual.',
      [
        { text: 'No, continuar', style: 'cancel' },
        {
          text: 'Cancelar despacho',
          style: 'destructive',
          onPress: async () => {
            const res = await cancelarDespacho();
            if (res.ok) {
              Toast.show({ type: 'info', text1: 'Despacho cancelado.' });
              resetDispatch();
              navigation.pop();
            } else {
              Toast.show({ type: 'error', text1: res.error });
            }
          },
        },
      ]
    );
  }, [cancelarDespacho, resetDispatch, navigation]);

  useEffect(() => {
    iniciarDespacho({ docNum });
  }, [docNum, iniciarDespacho]);

  const onCodigoEscaneado = useCallback(
    async (codigo) => {
      setScannerVisible(false);
      const resultado = await escanearArticulo(codigo);
      if (!resultado.ok && MENSAJES_RESULTADO[resultado.motivo]) {
        Toast.show({ type: 'info', text1: MENSAJES_RESULTADO[resultado.motivo] });
      }
    },
    [escanearArticulo]
  );

  if (!dispatchActual && estadoUI.loading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={styles.loadingText}>Cargando despacho…</Text>
      </View>
    );
  }

  if (!dispatchActual && estadoUI.error) {
    return (
      <View style={styles.centrado}>
        <MaterialCommunityIcons name="wifi-off" size={36} color={C.textMuted} />
        <Text style={styles.errorTxt}>{estadoUI.error}</Text>
        <Pressable
          onPress={() => iniciarDespacho({ docNum })}
          style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.btnPrimaryLabel}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!dispatchActual) return null;

  const items = dispatchActual.invoice?.items ?? [];
  const completados = items.filter((i) => i.estado === 'completado').length;
  const total = items.length;
  // Usar progress del backend (0-100) si está disponible, sino derivar localmente
  const progressPct = dispatchActual.progress ?? (total > 0 ? Math.round((completados / total) * 100) : 0);

  return (
    <View style={styles.container}>
      {/* Cabecera con progreso */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.docNum}>Factura #{dispatchActual.invoice?.docNum}</Text>
            {(dispatchActual.invoice?.customerName || dispatchActual.invoice?.cardName) && (
              <Text style={styles.cliente}>
                {dispatchActual.invoice.customerName ?? dispatchActual.invoice.cardName}
              </Text>
            )}
          </View>
          <View style={styles.progresoBadge}>
            <Text style={styles.progresoNum}>{completados}</Text>
            <Text style={styles.progresoSep}>/</Text>
            <Text style={styles.progresoTotal}>{total}</Text>
          </View>
        </View>
        <View style={styles.barraWrap}>
          <View style={[styles.barraFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {estadoUI.error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={13} color={C.danger} />
          <Text style={styles.errorBannerText}>{estadoUI.error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.itemCode}
        renderItem={({ item }) => (
          <ProductoItem
            item={item}
            sugerido={item.itemCode === itemActual}
            onMarcarFaltante={marcarFaltante}
          />
        )}
        contentContainerStyle={styles.lista}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {todosRevisados ? (
          <Pressable
            onPress={() => navigation.navigate(ROUTES.DESPACHO_CONFIRM)}
            style={({ pressed }) => [styles.btnScan, styles.btnScanListo, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnScanLabel}>Todos revisados — Ir a confirmar</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setScannerVisible(true)}
            style={({ pressed }) => [styles.btnScan, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="barcode-scan" size={18} color="#fff" />
            <Text style={styles.btnScanLabel}>Escanear artículo</Text>
          </Pressable>
        )}
        <View style={styles.footerRow}>
          {!todosRevisados && (
          <Pressable
            onPress={() => navigation.navigate(ROUTES.DESPACHO_CONFIRM)}
            style={({ pressed }) => [styles.btnConfirm, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.btnConfirmLabel}>Ir a confirmación</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={C.primary} />
          </Pressable>
          )}
          {soyResponsable && (
            <Pressable
              onPress={onCancelar}
              style={({ pressed }) => [styles.btnCancelar, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name="close" size={14} color={C.danger} />
              <Text style={styles.btnCancelarLabel}>Cancelar</Text>
            </Pressable>
          )}
        </View>
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
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl },
  loadingText: { fontSize: 14, color: C.textSec },
  errorTxt: { fontSize: 14, color: C.danger, textAlign: 'center' },

  header: {
    backgroundColor: C.surface,
    padding: S.base,
    gap: S.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docNum: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  cliente: { fontSize: 13, color: C.textSec, marginTop: 2 },
  progresoBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  progresoNum: { fontSize: 22, fontWeight: '700', color: C.primary, letterSpacing: -0.5 },
  progresoSep: { fontSize: 13, color: C.textMuted },
  progresoTotal: { fontSize: 15, fontWeight: '600', color: C.textSec },
  barraWrap: { height: 4, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  barraFill: { height: 4, backgroundColor: C.primary, borderRadius: 4 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    margin: S.base,
    padding: S.md,
    backgroundColor: C.dangerLight,
    borderRadius: 10,
  },
  errorBannerText: { fontSize: 13, color: C.danger, flex: 1 },

  lista: { paddingTop: S.sm, paddingBottom: S.sm },

  footer: {
    padding: S.base,
    gap: S.sm,
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  btnScan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnScanLabel: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  btnScanListo: { backgroundColor: C.success },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    paddingVertical: 10,
  },
  btnConfirmLabel: { fontSize: 14, fontWeight: '600', color: C.primary },
  btnCancelar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: S.sm,
    borderRadius: 8,
    backgroundColor: C.dangerLight,
  },
  btnCancelarLabel: { fontSize: 12, fontWeight: '600', color: C.danger },

  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: S.xl,
  },
  btnPrimaryLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
