import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import EstadoBadge from './EstadoBadge';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';

export default function ProductoItem({ item, sugerido, onMarcarFaltante }) {
  const puedeMarcarFaltante = item.estado === ESTADOS_ARTICULO.PENDIENTE;

  return (
    <Card style={[styles.card, sugerido && styles.cardSugerido]} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.info}>
          <Text variant="titleMedium">{item.itemCode}</Text>
          <Text variant="bodySmall" style={styles.cantidad}>
            {item.picked}/{item.quantity} unidades
          </Text>
          <EstadoBadge estado={item.estado} />
        </View>
        {puedeMarcarFaltante && (
          <Button compact mode="text" onPress={() => onMarcarFaltante(item.itemCode)}>
            Marcar faltante
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginVertical: 6 },
  cardSugerido: { borderColor: '#1565C0', borderWidth: 2 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { gap: 6, flex: 1 },
  cantidad: { color: '#616161' },
});
