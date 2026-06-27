import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, S, shadow } from '../../constants/theme';

const STATUS_CFG = {
  received:   { label: 'Recibida',    color: C.primary,    icon: 'inbox-arrow-down',   bg: C.primaryLight },
  reviewing:  { label: 'En revisión', color: C.warn,       icon: 'magnify',            bg: C.warnLight },
  confirmed:  { label: 'Confirmada',  color: C.success,    icon: 'check-circle',       bg: C.successLight },
  partial:    { label: 'Parcial',     color: C.warn,       icon: 'alert-circle',       bg: C.warnLight },
  rejected:   { label: 'Rechazada',   color: C.danger,     icon: 'close-circle',       bg: C.dangerLight },
  dispatched: { label: 'Despachada',  color: C.primaryDim, icon: 'truck-delivery',     bg: C.primaryLight },
};

export default function OrderCard({ order, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 45, bounciness: 2 }).start();

  const cfg = STATUS_CFG[order.status] ?? { label: order.status, color: C.textSec, icon: 'help-circle', bg: C.bg };
  const total = order.progress?.total ?? 0;
  const avail = order.progress?.available ?? 0;
  const pct   = total > 0 ? avail / total : 0;

  return (
    <Pressable
      onPressIn={() => press(0.98)}
      onPressOut={() => press(1)}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, shadow.sm, { transform: [{ scale }] }]}>
        {/* Acento lateral */}
        <View style={[styles.acento, { backgroundColor: cfg.color }]} />

        <View style={styles.body}>
          {/* Fila superior */}
          <View style={styles.topRow}>
            <Text style={styles.docNum}>#{order.docNum}</Text>
            <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
              <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[styles.badgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Cliente */}
          <Text style={styles.cliente} numberOfLines={1}>{order.cardName}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              Vence {new Date(order.docDueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
            </Text>
            {total > 0 && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.meta}>{avail}/{total} disponibles</Text>
              </>
            )}
          </View>

          {/* Barra de progreso — solo si tiene items revisados */}
          {total > 0 && pct > 0 && (
            <View style={styles.barraWrap}>
              <View style={[styles.barraFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: cfg.color }]} />
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
  body: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 4, gap: 5 },
  chevron: { alignSelf: 'center', marginRight: S.sm },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNum: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  cliente: { fontSize: 14, color: C.textSec, fontWeight: '500' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  meta: { fontSize: 12, color: C.textMuted },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border },

  barraWrap: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  barraFill: { height: 3, borderRadius: 2 },
});
