import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import EstadoBadge from './EstadoBadge';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';
import { C, S, shadow } from '../../constants/theme';

export default function ProductoItem({ item, sugerido, onMarcarFaltante }) {
  const puedeMarcarFaltante = item.estado === ESTADOS_ARTICULO.PENDIENTE;
  const completado = item.estado === ESTADOS_ARTICULO.COMPLETADO;

  return (
    <View style={[styles.card, shadow.sm, sugerido && styles.cardSugerido]}>
      {/* Acento lateral — azul si es el artículo sugerido siguiente */}
      <View style={[styles.acento, { backgroundColor: sugerido ? C.primary : C.border }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.codigoRow}>
              {sugerido && (
                <View style={styles.nextBadge}>
                  <Text style={styles.nextLabel}>SIGUIENTE</Text>
                </View>
              )}
              <Text style={[styles.codigo, completado && styles.codigoCompletado]}>
                {item.itemCode}
              </Text>
            </View>
            {(item.description || item.itemDescription) && (
              <Text style={styles.descripcion} numberOfLines={1}>
                {item.description ?? item.itemDescription}
              </Text>
            )}
            {item.binLocation && (
              <View style={styles.ubicacionRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.primaryDim} />
                <Text style={styles.ubicacion}>{item.binLocation}</Text>
              </View>
            )}
            <EstadoBadge estado={item.estado} />
          </View>

          <View style={styles.contadorWrap}>
            <Text style={[styles.contadorNum, completado && { color: C.success }]}>
              {item.picked}
            </Text>
            <Text style={styles.contadorSep}>/</Text>
            <Text style={styles.contadorTotal}>{item.quantity}</Text>
          </View>
        </View>

        {puedeMarcarFaltante && (
          <Pressable
            onPress={() => onMarcarFaltante(item.itemCode)}
            style={({ pressed }) => [styles.faltanteBtn, pressed && { opacity: 0.65 }]}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color={C.warn} />
            <Text style={styles.faltanteBtnLabel}>Marcar como faltante</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.surface,
    borderRadius: 14,
    marginHorizontal: S.base,
    marginVertical: 5,
    overflow: 'hidden',
  },
  cardSugerido: {
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  acento: { width: 4 },
  body: { flex: 1, padding: S.md, gap: S.sm },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  codigoRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs, flexWrap: 'wrap' },
  codigo: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  codigoCompletado: { color: C.textSec, textDecorationLine: 'line-through' },

  nextBadge: {
    backgroundColor: C.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nextLabel: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },

  contadorWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  descripcion: { fontSize: 12, color: C.textSec },
  ubicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ubicacion: { fontSize: 11, color: C.primaryDim, fontWeight: '600' },

  contadorNum: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  contadorSep: { fontSize: 14, color: C.textMuted },
  contadorTotal: { fontSize: 16, fontWeight: '600', color: C.textSec },

  faltanteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.warnLight,
  },
  faltanteBtnLabel: { fontSize: 12, fontWeight: '600', color: C.warn },
});
