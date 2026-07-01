import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { usePedidos } from '../../hooks/usePedidos';
import OrderStatusBadge from '../../components/pedidos/OrderStatusBadge';
import AvailabilityBadge from '../../components/pedidos/AvailabilityBadge';
import { ORDER_STATUS } from '../../store/pedidosStore';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={13} color={C.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ItemCard({ item }) {
  return (
    <View style={[styles.itemCard, shadow.sm]}>
      <View style={styles.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemCodigo}>{item.itemCode}</Text>
          {item.itemDescription && (
            <Text style={styles.itemDesc} numberOfLines={2}>{item.itemDescription}</Text>
          )}
        </View>
        <AvailabilityBadge availability={item.availability} />
      </View>
      <View style={styles.itemMeta}>
        <Text style={styles.metaChip}>Cant: {item.quantity}</Text>
        {item.sapStock != null && <Text style={styles.metaChip}>Stock SAP: {item.sapStock}</Text>}
        {item.netAvailable != null && <Text style={styles.metaChip}>Neto: {item.netAvailable}</Text>}
      </View>
      {item.transferNote && (
        <View style={styles.notaWrap}>
          <MaterialCommunityIcons name="swap-horizontal" size={11} color={C.warn} />
          <Text style={styles.nota}>{item.transferNote}</Text>
        </View>
      )}
    </View>
  );
}

function PrimaryButton({ label, icon, onPress, loading, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      )}
      <Text style={styles.primaryBtnLabel}>{label}</Text>
    </Pressable>
  );
}

export default function PedidosDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params ?? {};
  const { orderActual, estadoUI, user, fetchOrder, iniciarRevision, resetOrderActual } = usePedidos();

  useEffect(() => {
    fetchOrder(orderId);
    return () => resetOrderActual();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onIniciarRevision = useCallback(async () => {
    const resultado = await iniciarRevision(orderId);
    if (resultado.ok) {
      navigation.navigate(ROUTES.PEDIDOS_REVIEW, { orderId });
    } else {
      Toast.show({ type: 'error', text1: resultado.error });
    }
  }, [orderId, iniciarRevision, navigation]);

  const onContinuarRevision = useCallback(() => {
    navigation.navigate(ROUTES.PEDIDOS_REVIEW, { orderId });
  }, [orderId, navigation]);

  if (!orderActual && estadoUI.loading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!orderActual && estadoUI.error) {
    return (
      <View style={styles.centrado}>
        <MaterialCommunityIcons name="wifi-off" size={32} color={C.textMuted} />
        <Text style={styles.errorTxt}>{estadoUI.error}</Text>
        <Pressable
          onPress={() => fetchOrder(orderId)}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.primaryBtnLabel}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!orderActual) return null;

  const lock = orderActual.lock;
  // Toleramos varios posibles nombres de campo hasta que el backend confirme el correcto (ver bug.md BUG-02)
  const lockOwner = lock?.lockedBy ?? lock?.userId ?? lock?.user_id ?? lock?.user
    ?? lock?.reviewedBy ?? lock?.reviewed_by ?? lock?.createdBy ?? lock?.created_by
    ?? orderActual?.reviewed_by ?? orderActual?.reviewedBy;
  const esMiLock  = !!lockOwner && lockOwner === user?.userId;
  // Solo bloquear si conocemos al dueño del lock Y no soy yo.
  // Si lockOwner es desconocido (campo no mapeado aún), no bloquear al usuario actual.
  const otroTieneLock = !!lockOwner && !esMiLock;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      {/* Banner de lock ajeno */}
      {otroTieneLock && (
        <View style={styles.lockBanner}>
          <MaterialCommunityIcons name="lock" size={14} color={C.warn} />
          <Text style={styles.lockText}>
            En revisión por <Text style={{ fontWeight: '700' }}>{lockOwner ?? '—'}</Text> · solo lectura
          </Text>
        </View>
      )}

      {estadoUI.error && (
        <Pressable onPress={() => fetchOrder(orderId)} style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={14} color={C.danger} />
          <Text style={styles.errorBannerText}>{estadoUI.error} · Toca para reintentar</Text>
        </Pressable>
      )}

      {/* Header card */}
      <View style={[styles.headerCard, shadow.sm]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.docNum}>Orden #{orderActual.docNum}</Text>
            <Text style={styles.cliente}>{orderActual.cardName}</Text>
          </View>
          <OrderStatusBadge status={orderActual.status} />
        </View>

        <View style={styles.headerMeta}>
          <InfoRow
            icon="calendar"
            label="Fecha"
            value={orderActual.docDate
              ? new Date(orderActual.docDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          />
          <InfoRow
            icon="calendar-clock"
            label="Vence"
            value={orderActual.docDueDate
              ? new Date(orderActual.docDueDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          />
          {orderActual.notes && (
            <InfoRow icon="note-text" label="Nota" value={orderActual.notes} />
          )}
        </View>
      </View>

      {/* Artículos */}
      <Text style={styles.seccion}>
        ARTÍCULOS ({orderActual.items?.length ?? 0})
      </Text>

      {orderActual.items?.map((item) => (
        <ItemCard key={item.id ?? item.lineNum} item={item} />
      ))}

      {/* Acciones */}
      <View style={styles.acciones}>
        {orderActual.status === ORDER_STATUS.RECEIVED && (
          <PrimaryButton
            label="Iniciar revisión"
            icon="magnify"
            loading={estadoUI.loading}
            disabled={estadoUI.loading}
            onPress={onIniciarRevision}
          />
        )}

        {/* En revisión: mostrar botón si soy yo quien tiene el lock O si no hay lock */}
        {orderActual.status === ORDER_STATUS.REVIEWING && !otroTieneLock && (
          <PrimaryButton
            label={esMiLock ? 'Continuar revisión' : 'Retomar revisión'}
            icon="pencil"
            loading={!esMiLock && estadoUI.loading}
            disabled={!esMiLock && estadoUI.loading}
            onPress={esMiLock ? onContinuarRevision : onIniciarRevision}
          />
        )}

        {/* Parcial: permitir volver a revisar y ajustar artículos */}
        {orderActual.status === ORDER_STATUS.PARTIAL && (
          <PrimaryButton
            label="Revisar artículos parciales"
            icon="clipboard-edit-outline"
            onPress={onContinuarRevision}
          />
        )}

        {orderActual.status === ORDER_STATUS.CONFIRMED && (
          <View style={styles.confirmadaBanner}>
            <MaterialCommunityIcons name="check-circle" size={16} color={C.success} />
            <Text style={styles.confirmadaText}>Confirmada y lista para despacho</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  contenido: { padding: S.base, gap: S.md, paddingBottom: S.xxxl },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl },
  errorTxt: { fontSize: 14, color: C.danger, textAlign: 'center' },

  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    backgroundColor: C.warnLight,
    padding: S.md,
    borderRadius: 10,
  },
  lockText: { fontSize: 13, color: C.warn, flex: 1 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    backgroundColor: C.dangerLight,
    padding: S.md,
    borderRadius: 10,
  },
  errorBannerText: { fontSize: 13, color: C.danger, flex: 1 },

  headerCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: S.base,
    gap: S.md,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: S.sm },
  docNum: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  cliente: { fontSize: 14, color: C.textSec, marginTop: 2 },

  headerMeta: { gap: S.xs, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: S.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  infoLabel: { fontSize: 12, color: C.textMuted, width: 48 },
  infoValue: { fontSize: 13, color: C.text, fontWeight: '500', flex: 1 },

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
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.sm },
  itemCodigo: { fontSize: 14, fontWeight: '700', color: C.text },
  itemDesc: { fontSize: 13, color: C.textSec, marginTop: 2 },
  itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs },
  metaChip: {
    fontSize: 11,
    color: C.textSec,
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '600',
  },
  notaWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  nota: { fontSize: 12, color: C.warn, fontStyle: 'italic', flex: 1 },

  acciones: { gap: S.sm, marginTop: S.xs },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },

  confirmadaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.successLight,
    padding: S.md,
    borderRadius: 12,
  },
  confirmadaText: { fontSize: 14, fontWeight: '600', color: C.success },
});
