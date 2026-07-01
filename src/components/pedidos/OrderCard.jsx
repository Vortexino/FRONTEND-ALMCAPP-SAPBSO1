import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, S, shadow } from '../../constants/theme';

const STATUS_CFG = {
  received:   { label: 'Por revisar',  color: C.primary,    icon: 'inbox-arrow-down',   bg: C.primaryLight },
  reviewing:  { label: 'En revisión',  color: C.warn,       icon: 'magnify',            bg: C.warnLight },
  confirmed:  { label: 'Confirmada',   color: C.success,    icon: 'check-circle',       bg: C.successLight },
  partial:    { label: 'Parcial',      color: C.warn,       icon: 'alert-circle',       bg: C.warnLight },
  rejected:   { label: 'Rechazada',    color: C.danger,     icon: 'close-circle',       bg: C.dangerLight },
  dispatched: { label: 'Despachada',   color: C.primaryDim, icon: 'truck-delivery',     bg: C.primaryLight },
};

export default function OrderCard({ order, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 45, bounciness: 2 }).start();

  const cfg = STATUS_CFG[order.status] ?? { label: order.status, color: C.textSec, icon: 'help-circle', bg: C.bg };
  const total    = order.progress?.total    ?? 0;
  const pending  = order.progress?.pending  ?? 0;
  const revisados = total - pending;
  const pct = total > 0 ? revisados / total : 0;

  const enRevision = order.status === 'reviewing';
  const fechaVence = order.docDueDate
    ? new Date(order.docDueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })
    : null;

  return (
    <Pressable
      onPressIn={() => press(0.98)}
      onPressOut={() => press(1)}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, shadow.sm, { transform: [{ scale }] }]}>
        <View style={[styles.acento, { backgroundColor: cfg.color }]} />

        <View style={styles.body}>
          {/* Fila superior: número + badge de estado */}
          <View style={styles.topRow}>
            <Text style={styles.docNum}>#{order.docNum}</Text>
            <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
              <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[styles.badgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Cliente */}
          <Text style={styles.cliente} numberOfLines={1}>{order.cardName}</Text>

          {/* Meta: vencimiento + contadores */}
          <View style={styles.metaRow}>
            {fechaVence && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar-clock" size={11} color={C.textMuted} />
                <Text style={styles.meta}>Vence {fechaVence}</Text>
              </View>
            )}
            {total > 0 && (
              <>
                {fechaVence && <View style={styles.dot} />}
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clipboard-check-outline" size={11} color={C.textMuted} />
                  <Text style={styles.meta}>{revisados}/{total} revisados</Text>
                </View>
              </>
            )}
          </View>

          {/* Barra de progreso — solo cuando hay artículos en revisión */}
          {enRevision && total > 0 && (
            <View style={styles.barraWrap}>
              <View
                style={[
                  styles.barraFill,
                  { width: `${Math.round(pct * 100)}%`, backgroundColor: pct === 1 ? C.success : cfg.color },
                ]}
              />
            </View>
          )}

          {/* CTA sutil para órdenes recibidas sin revisar */}
          {order.status === 'received' && (
            <View style={styles.ctaRow}>
              <MaterialCommunityIcons name="play-circle-outline" size={12} color={C.primary} />
              <Text style={styles.ctaLabel}>Iniciar revisión</Text>
            </View>
          )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={18} color={C.border} style={styles.chevron} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.surface,
    borderRadius: 16,
    marginHorizontal: S.base,
    marginVertical: 5,
    overflow: 'hidden',
  },
  acento: { width: 4 },
  body: { flex: 1, paddingVertical: 13, paddingLeft: 14, paddingRight: 4, gap: 5 },
  chevron: { alignSelf: 'center', marginRight: S.sm },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm },
  docNum: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2, flex: 1 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  cliente: { fontSize: 13, color: C.textSec, fontWeight: '500' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 11, color: C.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border },

  barraWrap: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  barraFill: { height: 3, borderRadius: 2 },

  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ctaLabel: { fontSize: 11, fontWeight: '700', color: C.primary },
});
