import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { usePedidos } from '../../hooks/usePedidos';
import OrderCard from '../../components/pedidos/OrderCard';
import FilterBar from '../../components/shared/FilterBar';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import { ROUTES } from '../../constants/routes';
import { ORDER_STATUS } from '../../store/pedidosStore';
import { C, S, shadow } from '../../constants/theme';

const FILTROS = [
  { label: 'Todos',        value: null },
  { label: 'Por revisar',  value: ORDER_STATUS.RECEIVED },
  { label: 'En revisión',  value: ORDER_STATUS.REVIEWING },
  { label: 'Confirmado',   value: `${ORDER_STATUS.CONFIRMED},${ORDER_STATUS.PARTIAL}` },
];

const POLL_INTERVAL = 30_000;

function EmptyState({ query }) {
  if (query?.trim()) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyCircle}>
          <MaterialCommunityIcons name="magnify" size={28} color={C.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Sin resultados para "{query.trim()}"</Text>
        <Text style={styles.emptySub}>Probá con otro número o cambiá el filtro activo.</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCircle}>
        <MaterialCommunityIcons name="clipboard-text-off-outline" size={28} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin órdenes para mostrar</Text>
      <Text style={styles.emptySub}>Cuando lleguen órdenes de SAP van a aparecer aquí.</Text>
    </View>
  );
}

export default function PedidosListScreen() {
  const navigation = useNavigation();
  const { orders, estadoUI, fetchOrders } = usePedidos();
  const [filtro, setFiltro] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchOrders(filtro);
    intervalRef.current = setInterval(() => fetchOrders(filtro), POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(filtro);
    setRefreshing(false);
  }, [fetchOrders, filtro]);

  const onCambiarFiltro = useCallback((valor) => {
    clearInterval(intervalRef.current);
    setFiltro(valor);
    fetchOrders(valor);
    intervalRef.current = setInterval(() => fetchOrders(valor), POLL_INTERVAL);
  }, [fetchOrders]);

  // Filtra en tiempo real: muestra todo lo que contenga los dígitos escritos.
  const ordenesFiltradas = useMemo(() => {
    const q = query.trim();
    if (!q) return orders;
    return orders.filter((o) => String(o.docNum).includes(q));
  }, [orders, query]);

  const irADetalle = useCallback(
    (order) => navigation.navigate(ROUTES.PEDIDOS_DETAIL, { orderId: order.id }),
    [navigation]
  );

  // "Ir" o submit: requiere match exacto (no tiene fallback de API como Despacho).
  const irPorDocNum = useCallback((docNum) => {
    const exacto = orders.find((o) => String(o.docNum) === String(docNum).trim());
    if (exacto) {
      navigation.navigate(ROUTES.PEDIDOS_DETAIL, { orderId: exacto.id });
    } else {
      Toast.show({ type: 'info', text1: `Orden #${docNum} no encontrada`, text2: 'Verificá el número o cambiá el filtro activo.' });
    }
  }, [orders, navigation]);

  const onBuscarManual = useCallback(() => {
    const num = query.trim();
    if (!num) return;
    irPorDocNum(num);
  }, [query, irPorDocNum]);

  const onCodigoEscaneado = useCallback((codigo) => {
    setScannerVisible(false);
    irPorDocNum(codigo);
  }, [irPorDocNum]);

  return (
    <View style={styles.container}>
      {/* Búsqueda por número de orden */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          mode="outlined"
          placeholder="Número de orden"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onBuscarManual}
          keyboardType="numeric"
          returnKeyType="go"
          outlineStyle={{ borderRadius: 12 }}
          activeOutlineColor={C.primary}
          outlineColor={C.border}
          left={<TextInput.Icon icon="magnify" color={C.textMuted} />}
        />
        <Pressable
          onPress={() => setScannerVisible(true)}
          style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="barcode-scan" size={22} color={C.primary} />
        </Pressable>
        {query.trim().length > 0 && (
          <Pressable
            onPress={onBuscarManual}
            style={({ pressed }) => [styles.goBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.goBtnLabel}>Ir</Text>
          </Pressable>
        )}
      </View>

      <FilterBar opciones={FILTROS} seleccionado={filtro} onChange={onCambiarFiltro} />

      {estadoUI.error && (
        <Pressable onPress={() => fetchOrders(filtro)} style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={14} color={C.danger} />
          <Text style={styles.errorBannerText}>{estadoUI.error} · Toca para reintentar</Text>
        </Pressable>
      )}

      {estadoUI.loading && !refreshing && orders.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={C.primary} />
      ) : (
        <FlatList
          data={ordenesFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} onPress={() => irADetalle(item)} />}
          ListEmptyComponent={<EmptyState query={query} />}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        />
      )}

      <BarcodeScannerView
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={onCodigoEscaneado}
        title="Escanea el código de la orden"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: S.base,
    paddingVertical: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  searchInput: { flex: 1, backgroundColor: C.surface, height: 44 },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtn: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  goBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    marginHorizontal: S.base,
    marginTop: S.sm,
    padding: S.md,
    backgroundColor: C.dangerLight,
    borderRadius: 10,
  },
  errorBannerText: { fontSize: 13, color: C.danger, flex: 1 },

  loader: { marginTop: S.xxxl },
  lista: { paddingTop: S.sm, paddingBottom: S.xxxl },

  emptyWrap: { alignItems: 'center', paddingTop: S.xxxl, paddingHorizontal: S.xxl, gap: S.md },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 20 },
});
