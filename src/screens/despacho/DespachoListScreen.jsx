import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useDespacho } from '../../hooks/useDespacho';
import OrdenCard from '../../components/despacho/OrdenCard';
import FilterBar from '../../components/shared/FilterBar';
import BarcodeScannerView from '../../components/despacho/BarcodeScannerView';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

const FILTROS = [
  { label: 'Todos',        value: 'all' },
  { label: 'Por despachar', value: 'pending' },
  { label: 'En picking',   value: 'active' },
  { label: 'Completado',   value: 'completed' },
];

function EmptyState({ filtro, query }) {
  if (query.trim()) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyCircle}>
          <MaterialCommunityIcons name="magnify" size={28} color={C.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Sin resultados para "{query.trim()}"</Text>
        <Text style={styles.emptySub}>Probá con otro número o cambiá el filtro activo.</Text>
      </View>
    );
  }
  const msgs = {
    pending:   { icon: 'inbox-arrow-down',     title: 'Nada por despachar', sub: 'No hay facturas pendientes en este almacén.' },
    active:    { icon: 'barcode-scan',         title: 'Sin picking activo', sub: 'No hay despachos en curso ahora mismo.' },
    completed: { icon: 'check-circle-outline', title: 'Sin completados',    sub: 'Los despachos terminados aparecerán aquí.' },
    all:       { icon: 'package-variant',      title: 'Sin facturas',       sub: 'Las facturas confirmadas aparecen aquí.' },
  };
  const m = msgs[filtro] ?? msgs.all;
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCircle}>
        <MaterialCommunityIcons name={m.icon} size={28} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{m.title}</Text>
      <Text style={styles.emptySub}>{m.sub}</Text>
    </View>
  );
}

export default function DespachoListScreen() {
  const navigation = useNavigation();
  const { documentos, estadoUI, fetchDocumentos } = useDespacho();
  const [filtro, setFiltro] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const filtroRef = useRef('all');

  useFocusEffect(
    useCallback(() => {
      fetchDocumentos(filtroRef.current);
    }, [fetchDocumentos])
  );

  const onCambiarFiltro = useCallback((valor) => {
    filtroRef.current = valor;
    setFiltro(valor);
    fetchDocumentos(valor);
  }, [fetchDocumentos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDocumentos(filtroRef.current);
    setRefreshing(false);
  }, [fetchDocumentos]);

  // Filtra en tiempo real: muestra todo lo que contenga los dígitos escritos.
  const documentosFiltrados = useMemo(() => {
    const q = query.trim();
    if (!q) return documentos;
    return documentos.filter((d) => String(d.docNum).includes(q));
  }, [documentos, query]);

  const irADetalle = useCallback((documento) => {
    navigation.navigate(ROUTES.DESPACHO_DETAIL, {
      docNum: documento.docNum,
      customerName: documento.customerName,
      itemCount: documento.itemCount,
      dispatchStatus: documento.dispatchStatus,
      dispatchId: documento.dispatchId,
    });
  }, [navigation]);

  // "Ir" o submit: requiere match exacto en la lista cargada.
  const irPorDocNum = useCallback((num) => {
    const exacto = documentos.find((d) => String(d.docNum) === String(num).trim());
    if (exacto) {
      irADetalle(exacto);
    } else {
      Toast.show({ type: 'info', text1: `Factura #${num} no encontrada`, text2: 'Verificá el número o cambiá el filtro activo.' });
    }
  }, [documentos, irADetalle]);

  const onBuscarManual = useCallback(() => {
    const num = query.trim();
    if (!num) return;
    irPorDocNum(num);
  }, [query, irPorDocNum]);

  const onCodigoEscaneado = useCallback((codigo) => {
    setScannerVisible(false);
    irPorDocNum(codigo);
  }, [irPorDocNum]);

  return (
    <View style={styles.container}>
      {/* Búsqueda por número de factura */}
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

      {/* Filtros */}
      <FilterBar opciones={FILTROS} seleccionado={filtro} onChange={onCambiarFiltro} />

      {estadoUI.error && (
        <Pressable onPress={() => fetchDocumentos(filtro)} style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={14} color={C.danger} />
          <Text style={styles.errorBannerText}>{estadoUI.error} · Toca para reintentar</Text>
        </Pressable>
      )}

      {estadoUI.loading && !refreshing && documentos.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={C.primary} />
      ) : (
        <FlatList
          data={documentosFiltrados}
          keyExtractor={(item) => String(item.dispatchId ?? item.docEntry ?? item.docNum)}
          renderItem={({ item }) => (
            <OrdenCard documento={item} onPress={() => irADetalle(item)} />
          )}
          ListEmptyComponent={<EmptyState filtro={filtro} query={query} />}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
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

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    marginHorizontal: S.base,
    marginTop: S.sm,
    padding: S.md,
    backgroundColor: C.dangerLight,
    borderRadius: 10,
  },
  errorBannerText: { fontSize: 13, color: C.danger, flex: 1 },

  loader: { marginTop: S.xxxl },
  lista: { paddingTop: S.sm, paddingBottom: S.xxxl },

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
