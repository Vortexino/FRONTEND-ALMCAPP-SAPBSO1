import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useDespacho } from '../../hooks/useDespacho';
import ProductoItem from '../../components/despacho/ProductoItem';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import { ROUTES } from '../../constants/routes';

const MENSAJES_RESULTADO = {
  no_pertenece: 'Este código no corresponde a ningún artículo de este documento.',
  ya_completado: 'Este artículo ya fue completado.',
};

export default function DespachoDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { docNum, warehouseId } = route.params ?? {};
  const { dispatchActual, itemActual, estadoUI, iniciarDespacho, escanearArticulo, marcarFaltante } = useDespacho();
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    iniciarDespacho({ docNum, warehouseId });
  }, [docNum, warehouseId, iniciarDespacho]);

  const onCodigoEscaneado = useCallback(
    async (codigo) => {
      setScannerVisible(false);
      const resultado = await escanearArticulo(codigo);
      if (!resultado.ok && MENSAJES_RESULTADO[resultado.motivo]) {
        Toast.show({ type: 'info', text1: MENSAJES_RESULTADO[resultado.motivo] });
      }
    },
    [escanearArticulo]
  );

  if (!dispatchActual && estadoUI.loading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  if (!dispatchActual && estadoUI.error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.errorTexto}>{estadoUI.error}</Text>
        <Button mode="contained" onPress={() => iniciarDespacho({ docNum, warehouseId })}>
          Reintentar
        </Button>
      </View>
    );
  }

  if (!dispatchActual) return null;

  return (
    <View style={styles.container}>
      {estadoUI.error && (
        <Banner visible icon="wifi-off">
          {estadoUI.error}
        </Banner>
      )}

      <FlatList
        data={dispatchActual.invoice.items}
        keyExtractor={(item) => item.itemCode}
        renderItem={({ item }) => (
          <ProductoItem item={item} sugerido={item.itemCode === itemActual} onMarcarFaltante={marcarFaltante} />
        )}
        contentContainerStyle={styles.lista}
      />

      <View style={styles.footer}>
        <Button mode="contained" icon="barcode-scan" onPress={() => setScannerVisible(true)} style={styles.boton}>
          Escanear artículo
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate(ROUTES.DESPACHO_CONFIRM)} style={styles.boton}>
          Ir a confirmación
        </Button>
      </View>

      <BarcodeScannerView
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={onCodigoEscaneado}
        title="Escanea el código del artículo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 32 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  errorTexto: { textAlign: 'center', color: '#C62828' },
  lista: { paddingBottom: 12 },
  footer: { padding: 12, gap: 8 },
  boton: { borderRadius: 8 },
});
