import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDespacho } from '../../hooks/useDespacho';
import OrdenCard from '../../components/despacho/OrdenCard';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCircle}>
        <MaterialCommunityIcons name="package-variant" size={28} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Nada listo para despachar</Text>
      <Text style={styles.emptySub}>
        Las órdenes confirmadas aparecen aquí. También podés ingresar un número de factura directamente.
      </Text>
    </View>
  );
}

export default function DespachoListScreen() {
  const navigation = useNavigation();
  const { documentos, estadoUI, fetchDocumentos } = useDespacho();
  const [query, setQuery] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDocumentos();
    }, [fetchDocumentos])
  );

  const irADetalle = useCallback((documento) => {
    navigation.navigate(ROUTES.DESPACHO_DETAIL, { docNum: documento.docNum });
  }, [navigation]);

  const onCodigoEscaneado = useCallback((codigo) => {
    setScannerVisible(false);
    navigation.navigate(ROUTES.DESPACHO_DETAIL, { docNum: Number(codigo) });
  }, [navigation]);

  const onBuscarManual = useCallback(() => {
    const num = query.trim();
    if (!num) return;
    navigation.navigate(ROUTES.DESPACHO_DETAIL, { docNum: Number(num) });
  }, [query, navigation]);

  return (
    <View style={styles.container}>
      {/* Búsqueda manual */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          mode="outlined"
          placeholder="Número de factura"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onBuscarManual}
          keyboardType="numeric"
          returnKeyType="go"
          outlineStyle={{ borderRadius: 12 }}
          activeOutlineColor={C.primary}
          outlineColor={C.border}
          left={<TextInput.Icon icon="magnify" color={C.textMuted} />}
        />
        <Pressable
          onPress={() => setScannerVisible(true)}
          style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="barcode-scan" size={22} color={C.primary} />
        </Pressable>
        {query.trim().length > 0 && (
          <Pressable
            onPress={onBuscarManual}
            style={({ pressed }) => [styles.goBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.goBtnLabel}>Ir</Text>
          </Pressable>
        )}
      </View>

      {/* Separador con label */}
      <View style={styles.seccionRow}>
        <Text style={styles.seccionLabel}>LISTAS PARA DESPACHAR</Text>
        {estadoUI.error && (
          <Pressable onPress={fetchDocumentos}>
            <Text style={styles.reintentar}>Reintentar</Text>
          </Pressable>
        )}
      </View>

      {estadoUI.loading ? (
        <ActivityIndicator style={styles.loader} color={C.primary} />
      ) : (
        <FlatList
          data={documentos}
          keyExtractor={(item) => String(item.docEntry ?? item.docNum)}
          renderItem={({ item }) => (
            <OrdenCard documento={item} onPress={() => irADetalle(item)} />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.lista}
        />
      )}

      <BarcodeScannerView
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={onCodigoEscaneado}
        title="Escanea el código de la factura"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: S.base,
    paddingVertical: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  searchInput: { flex: 1, backgroundColor: C.surface, height: 44 },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtn: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  goBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },

  seccionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.base,
    paddingTop: S.base,
    paddingBottom: S.sm,
  },
  seccionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  reintentar: { fontSize: 12, fontWeight: '600', color: C.danger },

  loader: { marginTop: S.xxxl },
  lista: { paddingBottom: S.xxxl },

  emptyWrap: { alignItems: 'center', paddingTop: S.xxxl, paddingHorizontal: S.xxl, gap: S.md },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 20 },
});
