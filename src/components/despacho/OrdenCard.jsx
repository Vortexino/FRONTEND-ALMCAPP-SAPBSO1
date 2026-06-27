import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, S, shadow } from '../../constants/theme';

export default function OrdenCard({ documento, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 45, bounciness: 2 }).start();

  const vence = documento.docDueDate
    ? new Date(documento.docDueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })
    : null;

  return (
    <Pressable
      onPressIn={() => press(0.98)}
      onPressOut={() => press(1)}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, shadow.sm, { transform: [{ scale }] }]}>
        {/* Acento lateral — siempre verde (factura abierta lista para despachar) */}
        <View style={[styles.acento, { backgroundColor: C.success }]} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.docNum}>Factura #{documento.docNum}</Text>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="package-variant-closed" size={11} color={C.success} />
              <Text style={styles.badgeLabel}>Abierta</Text>
            </View>
          </View>

          {documento.customerName && (
            <Text style={styles.cliente} numberOfLines={1}>{documento.customerName}</Text>
          )}

          <View style={styles.footRow}>
            {documento.itemCount != null && (
              <>
                <MaterialCommunityIcons name="format-list-numbered" size={12} color={C.textMuted} />
                <Text style={styles.meta}>{documento.itemCount} artículos</Text>
              </>
            )}
            {vence && documento.itemCount != null && (
              <View style={styles.dot} />
            )}
            {vence && (
              <>
                <MaterialCommunityIcons name="calendar-clock" size={12} color={C.textMuted} />
                <Text style={styles.meta}>Vence {vence}</Text>
              </>
            )}
          </View>
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

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm },
  docNum: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2, flex: 1 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700', color: C.success },

  cliente: { fontSize: 14, color: C.textSec, fontWeight: '500' },

  footRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: C.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border },
});
