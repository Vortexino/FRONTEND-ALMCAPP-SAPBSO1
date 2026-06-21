import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useDespacho } from '../../hooks/useDespacho';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';
import { ROUTES } from '../../constants/routes';

export default function DespachoConfirmScreen() {
  const navigation = useNavigation();
  const { dispatchActual, todosRevisados, estadoUI, confirmarDespacho, resetDispatch } = useDespacho();

  const resumen = useMemo(() => {
    const items = dispatchActual?.invoice.items ?? [];
    return {
      completados: items.filter((item) => item.estado === ESTADOS_ARTICULO.COMPLETADO).length,
      faltantes: items.filter((item) => item.estado === ESTADOS_ARTICULO.FALTANTE).length,
      pendientes: items.filter((item) => item.estado === ESTADOS_ARTICULO.PENDIENTE).length,
      total: items.length,
    };
  }, [dispatchActual]);

  const onFinalizar = useCallback(async () => {
    const resultado = await confirmarDespacho();
    if (resultado.ok) {
      Toast.show({ type: 'success', text1: 'Despacho finalizado correctamente' });
      resetDispatch();
      navigation.navigate(ROUTES.DESPACHO_LIST);
    }
  }, [confirmarDespacho, resetDispatch, navigation]);

  if (!dispatchActual) return null;

  return (
    <View style={styles.container}>
      {estadoUI.error && (
        <Banner visible icon="wifi-off" actions={[{ label: 'Reintentar', onPress: onFinalizar }]}>
          {estadoUI.error}
        </Banner>
      )}

      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.contenido}>
          <Text variant="titleLarge">Factura {dispatchActual.invoice.docNum}</Text>
          <Text variant="bodyLarge">Completados: {resumen.completados}</Text>
          <Text variant="bodyLarge">Faltantes: {resumen.faltantes}</Text>
          {resumen.pendientes > 0 && (
            <Text variant="bodyMedium" style={styles.pendienteAviso}>
              Quedan {resumen.pendientes} artículo(s) sin revisar. Vuelve al picking para completarlos o
              marcarlos como faltantes antes de finalizar.
            </Text>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.boton}
        loading={estadoUI.loading}
        disabled={!todosRevisados || estadoUI.loading}
        onPress={onFinalizar}
      >
        Finalizar Despacho
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  card: { marginBottom: 8 },
  contenido: { gap: 8 },
  pendienteAviso: { color: '#F9A825' },
  boton: { borderRadius: 8, marginTop: 'auto' },
});
