import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

export default function OrdenCard({ documento, onPress }) {
  return (
    <Card style={styles.card} mode="elevated" onPress={onPress}>
      <Card.Content>
        <Text variant="titleMedium">Factura {documento.docNum}</Text>
        {documento.cardName && <Text variant="bodyMedium">{documento.cardName}</Text>}
        {documento.status && <Text variant="bodySmall" style={styles.status}>{documento.status}</Text>}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginVertical: 6 },
  status: { color: '#616161' },
});
