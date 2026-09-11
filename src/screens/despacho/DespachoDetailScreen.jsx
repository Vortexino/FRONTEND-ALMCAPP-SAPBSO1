import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

function ItemPreviewCard({ item }) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemCodigo}>{item.itemCode}</Text>
          {(item.description || item.itemDescription) ? (
            <Text style={styles.itemDesc} numberOfLines={2}>
              {item.description ?? item.itemDescription}
            </Text>
          ) : null}
          {item.binLocation ? (
            <View style={styles.itemUbicRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.primaryDim} />
              <Text style={styles.itemUbic}>{item.binLocation}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.itemCantWrap}>
          <Text style={styles.itemCant}>{item.quantity}</Text>
          <Text style={styles.itemCantLabel}>und.</Text>
        </View>
      </View>
    </View>
  );
}

const MENSAJES_RESULTADO = {
  no_pertenece:     'Código no corresponde a ningún artículo de este documento.',
  ya_completado:    'Este artículo ya fue completado.',
  orden_incorrecto: 'Sigue el orden de picking — escanea el artículo resaltado primero.',
};

export default function DespachoDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    docNum,
    customerName: paramCustomerName,
    itemCount: paramItemCount,
    dispatchStatus: paramDispatchStatus,
  } = route.params ?? {};

  const {
    dispatchActual, itemActual, estadoUI, user, todosRevisados,
    iniciarDespacho, escanearArticulo, revertirCompletado, cancelarDespacho, resetDispatch,
  } = useDespacho();

  // 'preview' = mostrar info de la factura + botón "Iniciar despacho"
  // 'picking' = flujo de picking activo
  const [fase, setFase] = useState('preview');
  const [scannerVisible, setScannerVisible] = useState(false);
  const hidRef = useRef(null);

  useEffect(() => {
    if (!scannerVisible) {
      setTimeout(() => hidRef.current?.focus(), 150);
    }
  }, [scannerVisible]);

  // Determinar estado inicial al montar.
  // Siempre mostrar preview primero — nunca saltar directamente a picking.
  useEffect(() => {
    if (
      dispatchActual &&
      Number(dispatchActual.invoice?.docNum) === Number(docNum)
    ) {
      // Items ya disponibles en el store — no hace falta fetch adicional.
      return;
    }
    if (paramDispatchStatus === 'active') {
      // Cargar el despacho existente silenciosamente para mostrar sus artículos
      // en el preview. No se cambia fase — el operario decide cuándo retomar.
      iniciarDespacho({ docNum });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onIniciarDespacho = useCallback(async () => {
    if (dispatchActual && Number(dispatchActual.invoice?.docNum) === Number(docNum)) {
      setFase('picking');
      return;
    }
    const res = await iniciarDespacho({ docNum });
    if (res.ok) setFase('picking');
  }, [docNum, dispatchActual, iniciarDespacho]);

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

  // ─── PREVIEW: información de la factura + lista de artículos + botón ────────
  if (fase === 'preview') {
    const previewItems = dispatchActual?.invoice?.items ?? [];
    const yaEsEsteDespacho =
      dispatchActual && Number(dispatchActual.invoice?.docNum) === Number(docNum);

    return (
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.previewContenido}>
          <View style={[styles.previewCard, shadow.sm]}>
            <View style={styles.previewIconCircle}>
              <MaterialCommunityIcons name="file-document-outline" size={32} color={C.primary} />
            </View>
            <Text style={styles.previewDocNum}>Factura #{docNum}</Text>
            {paramCustomerName ? (
              <Text style={styles.previewCliente}>{paramCustomerName}</Text>
            ) : null}
            {paramItemCount > 0 ? (
              <View style={styles.previewMeta}>
                <MaterialCommunityIcons name="format-list-numbered" size={14} color={C.textMuted} />
                <Text style={styles.previewMetaTxt}>
                  {paramItemCount} artículo{paramItemCount !== 1 ? 's' : ''} por despachar
                </Text>
              </View>
            ) : null}
          </View>

          {estadoUI.error ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={C.danger} />
              <Text style={styles.errorBannerText}>{estadoUI.error}</Text>
            </View>
          ) : null}

          {estadoUI.loading && previewItems.length === 0 ? (
            <ActivityIndicator style={{ marginTop: S.xl }} color={C.primary} />
          ) : null}

          {previewItems.length > 0 ? (
            <>
              <Text style={styles.seccion}>ARTÍCULOS ({previewItems.length})</Text>
              {previewItems.map((item) => (
                <ItemPreviewCard key={item.itemCode} item={item} />
              ))}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.previewFooter}>
          <Pressable
            onPress={onIniciarDespacho}
            disabled={estadoUI.loading}
            style={({ pressed }) => [
              styles.btnIniciar,
              (estadoUI.loading || pressed) && { opacity: 0.8 },
            ]}
          >
            {estadoUI.loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="play-circle-outline" size={20} color="#fff" />
            )}
            <Text style={styles.btnIniciarLabel}>
              {estadoUI.loading
                ? 'Cargando…'
                : yaEsEsteDespacho
                ? 'Retomar despacho'
                : 'Iniciar despacho'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── PICKING ────────────────────────────────────────────────────────────────
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
          onPress={onIniciarDespacho}
          style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.btnPrimaryLabel}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!dispatchActual) return null;

  const items = dispatchActual.invoice?.items ?? [];
  const total = items.length;
  const revisados = items.filter((i) => i.estado === 'completado').length;
  const progressPct = total > 0 ? Math.round((revisados / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.docNum}>Factura #{dispatchActual.invoice?.docNum}</Text>
            {(dispatchActual.invoice?.customerName || dispatchActual.invoice?.cardName) && (
              <Text style={styles.cliente}>
                {dispatchActual.invoice.customerName ?? dispatchActual.invoice.cardName}
              </Text>
            )}
          </View>
          <View style={styles.progresoBadge}>
            <Text style={styles.progresoNum}>{revisados}</Text>
            <Text style={styles.progresoSep}>/</Text>
            <Text style={styles.progresoTotal}>{total}</Text>
          </View>
        </View>
        <View style={styles.barraWrap}>
          <View style={[styles.barraFill, { width: `${progressPct}%`, backgroundColor: progressPct === 100 ? C.success : C.primary }]} />
        </View>
        {!todosRevisados && (
          <View style={styles.avisoPendiente}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={C.warn} />
            <Text style={styles.avisoTexto}>
              {total - revisados} artículo(s) pendiente(s) · escaneá o confirmá visualmente
            </Text>
          </View>
        )}
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
            disabled={estadoUI.loading}
            onConfirmarVisual={onCodigoEscaneado}
            onDeshacer={revertirCompletado}
          />
        )}
        contentContainerStyle={styles.lista}
      />

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

  // Preview
  previewContenido: { padding: S.base, gap: S.md, paddingBottom: S.xl },
  previewCard: {
    padding: S.xl,
    backgroundColor: C.surface,
    borderRadius: 16,
    alignItems: 'center',
    gap: S.md,
  },
  previewIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.xs,
  },
  previewDocNum: { fontSize: 20, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  previewCliente: { fontSize: 14, color: C.textSec, textAlign: 'center' },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  previewMetaTxt: { fontSize: 13, color: C.textMuted },
  previewFooter: {
    padding: S.base,
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },

  seccion: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginTop: S.xs,
  },
  itemCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: S.md,
    gap: S.xs,
    ...shadow.sm,
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: S.sm,
  },
  itemCodigo: { fontSize: 14, fontWeight: '700', color: C.text },
  itemDesc: { fontSize: 13, color: C.textSec, marginTop: 2 },
  itemUbicRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  itemUbic: { fontSize: 11, color: C.primaryDim },
  itemCantWrap: { alignItems: 'center', minWidth: 36 },
  itemCant: { fontSize: 20, fontWeight: '700', color: C.primary, lineHeight: 24 },
  itemCantLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  btnIniciar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnIniciarLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Picking
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
  barraFill: { height: 4, borderRadius: 4 },

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
