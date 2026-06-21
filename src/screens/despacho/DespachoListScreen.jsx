import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, IconButton, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDespacho } from '../../hooks/useDespacho';
import OrdenCard from '../../components/despacho/OrdenCard';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import { ROUTES } from '../../constants/routes';

export default function DespachoListScreen() {
  const navigation = useNavigation();
  const { documentos, estadoUI, fetchDocumentos } = useDespacho();
  const [query, setQuery] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  // Refresca al recibir foco (incluye el regreso desde DespachoConfirmScreen tras cerrar un despacho).
  useFocusEffect(
    useCallback(() => {
      fetchDocumentos(query);
    }, [fetchDocumentos, query])
  );

  const buscar = useCallback((texto) => {
    setQuery(texto);
    fetchDocumentos(texto);
  }, [fetchDocumentos]);

  const onCodigoEscaneado = useCallback((codigo) => {
    setScannerVisible(false);
    buscar(codigo);
  }, [buscar]);

  const irADetalle = useCallback((documento) => {
    navigation.navigate(ROUTES.DESPACHO_DETAIL, {
      docNum: documento.docNum,
      warehouseId: documento.warehouseId,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.buscador}>
        <TextInput
          style={styles.input}
          mode="outlined"
          placeholder="Número de documento"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => buscar(query)}
          returnKeyType="search"
        />
        <IconButton icon="barcode-scan" mode="contained" size={28} onPress={() => setScannerVisible(true)} />
      </View>

      {estadoUI.error && (
        <Banner
          visible
          actions={[{ label: 'Reintentar', onPress: () => buscar(query) }]}
          icon="wifi-off"
        >
          {estadoUI.error}
        </Banner>
      )}

      {estadoUI.loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={documentos}
          keyExtractor={(item) => String(item.docNum)}
          renderItem={({ item }) => <OrdenCard documento={item} onPress={() => irADetalle(item)} />}
          ListEmptyComponent={<Text style={styles.vacio}>No hay documentos abiertos.</Text>}
          contentContainerStyle={styles.lista}
        />
      )}

      <BarcodeScannerView
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={onCodigoEscaneado}
        title="Escanea el código del documento"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  buscador: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  input: { flex: 1 },
  loader: { marginTop: 32 },
  lista: { paddingBottom: 24 },
  vacio: { textAlign: 'center', marginTop: 32, color: '#616161' },
});
