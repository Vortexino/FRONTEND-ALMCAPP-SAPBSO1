import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useDespacho } from '../../hooks/useDespacho';
import { ESTADOS_ARTICULO } from '../../store/despachoStore';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

function ResumenFila({ icon, color, bg, label, cantidad }) {
  return (
    <View style={[styles.resumenFila, { backgroundColor: bg }]}>
      <View style={[styles.resumenIcon, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.resumenLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.resumenNum, { color }]}>{cantidad}</Text>
    </View>
  );
}

export default function DespachoConfirmScreen() {
  const navigation = useNavigation();
  const { dispatchActual, todosRevisados, estadoUI, confirmarDespacho, resetDispatch } = useDespacho();

  const resumen = useMemo(() => {
    const items = dispatchActual?.invoice?.items ?? [];
    return {
      completados: items.filter((i) => i.estado === ESTADOS_ARTICULO.COMPLETADO).length,
      faltantes:   items.filter((i) => i.estado === ESTADOS_ARTICULO.FALTANTE).length,
      pendientes:  items.filter((i) => i.estado === ESTADOS_ARTICULO.PENDIENTE).length,
      total: items.length,
    };
  }, [dispatchActual]);

  const onFinalizar = useCallback(async () => {
    const resultado = await confirmarDespacho();
    if (resultado.ok) {
      Toast.show({ type: 'success', text1: 'Despacho finalizado correctamente' });
      resetDispatch();
      navigation.pop(2);
    }
  }, [confirmarDespacho, resetDispatch, navigation]);

  if (!dispatchActual) return null;

  // progress del backend (0-100) tiene precedencia
  const progressPct = dispatchActual.progress
    ?? (resumen.total > 0 ? Math.round(((resumen.completados + resumen.faltantes) / resumen.total) * 100) : 0);

  return (
    <View style={styles.container}>
      {estadoUI.error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={14} color={C.danger} />
          <Text style={styles.errorText}>{estadoUI.error}</Text>
          <Pressable onPress={onFinalizar}>
            <Text style={styles.reintentar}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* Cabecera */}
      <View style={[styles.headerCard, shadow.sm]}>
        <Text style={styles.docNum}>Factura #{dispatchActual.invoice?.docNum}</Text>
        {(dispatchActual.invoice?.customerName || dispatchActual.invoice?.cardName) && (
          <Text style={styles.cliente}>
            {dispatchActual.invoice.customerName ?? dispatchActual.invoice.cardName}
          </Text>
        )}

        {/* Barra de progreso */}
        <View style={styles.barraWrap}>
          <View style={[styles.barraFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.barraLabel}>
          {resumen.completados + resumen.faltantes} de {resumen.total} artículos revisados
        </Text>
      </View>

      {/* Resumen */}
      <Text style={styles.seccion}>RESUMEN</Text>

      <View style={styles.resumenCard}>
        <ResumenFila
          icon="check-circle"
          color={C.success}
          bg={C.successLight}
          label="Completados"
          cantidad={resumen.completados}
        />
        <View style={styles.divisor} />
        <ResumenFila
          icon="alert-circle"
          color={C.warn}
          bg={C.warnLight}
          label="Faltantes"
          cantidad={resumen.faltantes}
        />
        {resumen.pendientes > 0 && (
          <>
            <View style={styles.divisor} />
            <ResumenFila
              icon="clock-outline"
              color={C.textSec}
              bg={C.bg}
              label="Sin revisar"
              cantidad={resumen.pendientes}
            />
          </>
        )}
      </View>

      {resumen.pendientes > 0 && (
        <View style={styles.avisoPendiente}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.warn} />
          <Text style={styles.avisoTexto}>
            Quedan {resumen.pendientes} artículo(s) sin revisar. Volvé al picking para completarlos o marcarlos como faltantes.
          </Text>
        </View>
      )}

      {/* Botón final */}
      <View style={{ flex: 1 }} />
      <View style={styles.footer}>
        <Pressable
          onPress={onFinalizar}
          disabled={!todosRevisados || estadoUI.loading}
          style={({ pressed }) => [
            styles.btnFinalizar,
            (!todosRevisados || estadoUI.loading) && { opacity: 0.45 },
            pressed && todosRevisados && { opacity: 0.85 },
          ]}
        >
          {estadoUI.loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="truck-fast" size={18} color="#fff" />
          )}
          <Text style={styles.btnFinalizarLabel}>Finalizar despacho</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: S.base, gap: S.md },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    backgroundColor: C.dangerLight,
    padding: S.md,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, color: C.danger, flex: 1 },
  reintentar: { fontSize: 12, fontWeight: '700', color: C.danger },

  headerCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: S.base,
    gap: S.sm,
  },
  docNum: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  cliente: { fontSize: 14, color: C.textSec },
  barraWrap: { height: 6, backgroundColor: C.border, borderRadius: 6, overflow: 'hidden', marginTop: S.xs },
  barraFill: { height: 6, backgroundColor: C.primary, borderRadius: 6 },
  barraLabel: { fontSize: 12, color: C.textMuted, textAlign: 'right' },

  seccion: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: C.textMuted,
    textTransform: 'uppercase',
  },

  resumenCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadow.sm,
  },
  resumenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.base,
  },
  resumenIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumenLabel: { fontSize: 14, fontWeight: '600' },
  resumenNum: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  divisor: { height: 0.5, backgroundColor: C.border, marginHorizontal: S.base },

  avisoPendiente: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.xs,
    backgroundColor: C.warnLight,
    padding: S.md,
    borderRadius: 12,
  },
  avisoTexto: { fontSize: 13, color: C.warn, flex: 1, lineHeight: 18 },

  footer: { paddingBottom: S.sm },
  btnFinalizar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  btnFinalizarLabel: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
});
