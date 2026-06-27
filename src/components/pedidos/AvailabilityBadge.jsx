import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from '../../constants/theme';
import { ITEM_AVAILABILITY } from '../../store/pedidosStore';

const CONFIG = {
  [ITEM_AVAILABILITY.PENDING]:        { label: 'Sin revisar',   icon: 'clock-outline',  color: C.textSec,    bg: C.bg },
  [ITEM_AVAILABILITY.AVAILABLE]:      { label: 'Disponible',    icon: 'check-circle',   color: C.success,    bg: C.successLight },
  [ITEM_AVAILABILITY.NEEDS_TRANSFER]: { label: 'Traslado',      icon: 'swap-horizontal',color: C.warn,       bg: C.warnLight },
  [ITEM_AVAILABILITY.UNAVAILABLE]:    { label: 'Sin stock',     icon: 'close-circle',   color: C.danger,     bg: C.dangerLight },
};

export default function AvailabilityBadge({ availability }) {
  const cfg = CONFIG[availability] ?? { label: availability, icon: 'help-circle', color: C.textSec, bg: C.bg };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <MaterialCommunityIcons name={cfg.icon} size={10} color={cfg.color} />
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
});
