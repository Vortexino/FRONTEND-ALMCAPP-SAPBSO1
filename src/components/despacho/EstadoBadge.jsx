import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';

const CONFIG = {
  [ESTADOS_ARTICULO.PENDIENTE]: { label: 'Pendiente', color: '#757575', icon: 'clock-outline' },
  [ESTADOS_ARTICULO.COMPLETADO]: { label: 'Completado', color: '#2E7D32', icon: 'check-circle' },
  [ESTADOS_ARTICULO.FALTANTE]: { label: 'Faltante', color: '#F9A825', icon: 'alert-circle' },
  [ESTADOS_ARTICULO.ERROR_ESCANEO]: { label: 'Error de escaneo', color: '#C62828', icon: 'close-circle' },
};

export default function EstadoBadge({ estado }) {
  const config = CONFIG[estado] ?? CONFIG[ESTADOS_ARTICULO.PENDIENTE];
  return (
    <Chip icon={config.icon} style={[styles.chip, { backgroundColor: config.color }]} textStyle={styles.text}>
      {config.label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start' },
  text: { color: '#fff', fontWeight: '600' },
});
