import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePedidos } from '../../hooks/usePedidos';
import OrderCard from '../../components/pedidos/OrderCard';
import { ROUTES } from '../../constants/routes';
import { ORDER_STATUS } from '../../store/pedidosStore';
import { C, S, shadow } from '../../constants/theme';

const FILTROS = [
  { label: 'Todos',       value: null },
  { label: 'Por revisar', value: `${ORDER_STATUS.RECEIVED},${ORDER_STATUS.REVIEWING}` },
  { label: 'Confirmadas', value: `${ORDER_STATUS.CONFIRMED},${ORDER_STATUS.PARTIAL}` },
  { label: 'Rechazadas',  value: ORDER_STATUS.REJECTED },
];

const POLL_INTERVAL = 30_000;

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState() {
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

  const irADetalle = useCallback(
    (order) => navigation.navigate(ROUTES.PEDIDOS_DETAIL, { orderId: order.id }),
    [navigation]
  );

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filtrosWrap}>
        {FILTROS.map((f) => (
          <FilterChip
            key={String(f.value)}
            label={f.label}
            active={filtro === f.value}
            onPress={() => onCambiarFiltro(f.value)}
          />
        ))}
      </View>

      {/* Error inline */}
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
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} onPress={() => irADetalle(item)} />}
          ListEmptyComponent={<EmptyState />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  filtrosWrap: {
    flexDirection: 'row',
    gap: S.sm,
    paddingHorizontal: S.base,
    paddingVertical: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipLabel: { fontSize: 12, fontWeight: '600', color: C.textSec },
  chipLabelActive: { color: '#fff' },

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
