import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, S, shadow } from '../../constants/theme';

const DISPATCH_CFG = {
  pending:   { label: 'Por despachar',  color: C.primary,    icon: 'inbox-arrow-down',   bg: C.primaryLight },
  active:    { label: 'En picking',     color: C.warn,       icon: 'barcode-scan',        bg: C.warnLight },
  completed: { label: 'Completado',     color: C.success,    icon: 'check-circle',        bg: C.successLight },
};

export default function OrdenCard({ documento, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 45, bounciness: 2 }).start();

  const dispatchStatus = documento.dispatchStatus ?? 'pending';
  const cfg = DISPATCH_CFG[dispatchStatus] ?? DISPATCH_CFG.pending;

  const itemCount   = documento.itemCount   ?? 0;
  const itemsPicked = documento.itemsPicked ?? 0;
  const pct = itemCount > 0 ? itemsPicked / itemCount : 0;

  const enPickin = dispatchStatus === 'active';

  const vence = documento.docDueDate
    ? new Date(documento.docDueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })
    : null;

  const fechaCompletar = documento.completedAt
    ? new Date(documento.completedAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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
          {/* Fila superior: número + badge */}
          <View style={styles.topRow}>
            <Text style={styles.docNum}>Factura #{documento.docNum}</Text>
            <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
              <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[styles.badgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Cliente */}
          {documento.customerName ? (
            <Text style={styles.cliente} numberOfLines={1}>{documento.customerName}</Text>
          ) : null}

          {/* Meta */}
          <View style={styles.metaRow}>
            {itemCount > 0 && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="format-list-numbered" size={11} color={C.textMuted} />
                <Text style={styles.meta}>
                  {enPickin || dispatchStatus === 'completed'
                    ? `${itemsPicked}/${itemCount} recogidos`
                    : `${itemCount} artículo${itemCount !== 1 ? 's' : ''}`}
                </Text>
              </View>
            )}
            {(vence || fechaCompletar) && itemCount > 0 && <View style={styles.dot} />}
            {dispatchStatus === 'completed' && fechaCompletar ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="check-circle-outline" size={11} color={C.success} />
                <Text style={[styles.meta, { color: C.success }]}>{fechaCompletar}</Text>
              </View>
            ) : vence ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar-clock" size={11} color={C.textMuted} />
                <Text style={styles.meta}>Vence {vence}</Text>
              </View>
            ) : null}
          </View>

          {/* Barra de progreso — solo en picking activo */}
          {enPickin && itemCount > 0 && (
            <View style={styles.barraWrap}>
              <View
                style={[
                  styles.barraFill,
                  { width: `${Math.round(pct * 100)}%`, backgroundColor: pct === 1 ? C.success : C.warn },
                ]}
              />
            </View>
          )}

          {/* CTA para facturas sin despacho iniciado */}
          {dispatchStatus === 'pending' && (
            <View style={styles.ctaRow}>
              <MaterialCommunityIcons name="play-circle-outline" size={12} color={C.primary} />
              <Text style={styles.ctaLabel}>Iniciar despacho</Text>
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
