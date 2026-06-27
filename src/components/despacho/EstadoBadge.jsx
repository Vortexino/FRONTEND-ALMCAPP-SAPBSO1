import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from '../../constants/theme';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';

const CONFIG = {
  [ESTADOS_ARTICULO.PENDIENTE]:     { label: 'Pendiente',  icon: 'clock-outline',  color: C.textSec, bg: C.bg },
  [ESTADOS_ARTICULO.COMPLETADO]:    { label: 'Listo',      icon: 'check-circle',   color: C.success, bg: C.successLight },
  [ESTADOS_ARTICULO.FALTANTE]:      { label: 'Faltante',   icon: 'alert-circle',   color: C.warn,    bg: C.warnLight },
  [ESTADOS_ARTICULO.ERROR_ESCANEO]: { label: 'Error',      icon: 'close-circle',   color: C.danger,  bg: C.dangerLight },
};

export default function EstadoBadge({ estado }) {
  const cfg = CONFIG[estado] ?? CONFIG[ESTADOS_ARTICULO.PENDIENTE];
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
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
