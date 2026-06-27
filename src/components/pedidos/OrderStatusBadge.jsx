import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from '../../constants/theme';
import { ORDER_STATUS } from '../../store/pedidosStore';

const CONFIG = {
  [ORDER_STATUS.RECEIVED]:   { label: 'Recibida',    icon: 'inbox-arrow-down', color: C.primary,    bg: C.primaryLight },
  [ORDER_STATUS.REVIEWING]:  { label: 'En revisión', icon: 'magnify',          color: C.warn,       bg: C.warnLight },
  [ORDER_STATUS.CONFIRMED]:  { label: 'Confirmada',  icon: 'check-circle',     color: C.success,    bg: C.successLight },
  [ORDER_STATUS.PARTIAL]:    { label: 'Parcial',     icon: 'alert-circle',     color: C.warn,       bg: C.warnLight },
  [ORDER_STATUS.REJECTED]:   { label: 'Rechazada',   icon: 'close-circle',     color: C.danger,     bg: C.dangerLight },
  [ORDER_STATUS.DISPATCHED]: { label: 'Despachada',  icon: 'truck-delivery',   color: C.primaryDim, bg: C.primaryLight },
};

export default function OrderStatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, icon: 'help-circle', color: C.textSec, bg: C.bg };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
