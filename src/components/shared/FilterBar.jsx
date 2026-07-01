import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { C, S } from '../../constants/theme';

/**
 * Fila horizontal de chips de filtro reutilizable.
 * Props:
 *   opciones    Array<{ label: string, value: any }>
 *   seleccionado  value actual
 *   onChange    (value) => void
 */
export default function FilterBar({ opciones, seleccionado, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {opciones.map((op) => {
        const activo = seleccionado === op.value;
        return (
          <Pressable
            key={String(op.value)}
            onPress={() => onChange(op.value)}
            style={({ pressed }) => [
              styles.chip,
              activo && styles.chipActivo,
              pressed && { opacity: 0.72 },
            ]}
          >
            <Text style={[styles.label, activo && styles.labelActivo]}>{op.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,   // impide que el ScrollView ocupe el espacio restante del flex padre
    flexShrink: 0,
    backgroundColor: C.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center', // evita que los chips se estiren verticalmente
    gap: S.sm,
    paddingHorizontal: S.base,
    paddingVertical: S.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignSelf: 'flex-start', // cada chip solo ocupa el ancho de su texto
  },
  chipActivo: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  label: { fontSize: 13, fontWeight: '600', color: C.textSec },
  labelActivo: { color: '#fff' },
});
