import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import { ROUTES } from '../../constants/routes';
import { C, S, shadow } from '../../constants/theme';

// ── Tarjeta KPI ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = C.primary, colorLight }) {
  const bg = colorLight ?? C.primaryLight;
  return (
    <View style={[styles.kpiCard, shadow.sm]}>
      <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>
        {value !== null ? String(value) : '—'}
      </Text>
    </View>
  );
}

// ── Botón de módulo con feedback táctil ───────────────────────────────────────
function ModuleButton({ label, subtitle, icon, color, colorLight, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 3 }).start();

  return (
    <Pressable
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.modulo, shadow.sm, { transform: [{ scale }] }]}>
        <View style={[styles.moduloIconBox, { backgroundColor: colorLight }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.moduloLabel}>{label}</Text>
        <Text style={styles.moduloSub}>{subtitle}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { summary, loading, error, fetchSummary } = useDashboard();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onRefresh = useCallback(async () => {
    await fetchSummary();
  }, [fetchSummary]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          <Text style={styles.userMeta}>
            {user?.role?.toUpperCase()} · ALMACÉN {user?.warehouseCode}
          </Text>
        </View>
        <Pressable onPress={logout} style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.6 }]}>
          <MaterialCommunityIcons name="logout" size={18} color={C.textSec} />
        </Pressable>
      </View>

      {/* Métricas del día */}
      <View style={styles.seccionHeader}>
        <Text style={styles.seccionLabel}>RESUMEN DE HOY</Text>
        {error && <Text style={styles.errorInline}>Sin conexión</Text>}
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard
          label="Pendientes"
          value={summary.orders_pending}
          icon="clipboard-clock-outline"
          color={C.warn}
          colorLight={C.warnLight}
        />
        <KpiCard
          label="Confirmadas"
          value={summary.orders_confirmed}
          icon="clipboard-check-outline"
          color={C.success}
          colorLight={C.successLight}
        />
        <KpiCard
          label="Órdenes hoy"
          value={summary.orders_today}
          icon="calendar-today"
          color={C.primary}
          colorLight={C.primaryLight}
        />
        <KpiCard
          label="Despachos"
          value={summary.dispatches_today}
          icon="truck-fast-outline"
          color={C.primaryDim}
          colorLight={C.primaryLight}
        />
      </View>

      {/* Acceso a módulos */}
      <Text style={[styles.seccionLabel, { marginTop: S.xl, marginBottom: S.md }]}>
        MÓDULOS
      </Text>

      <View style={styles.modulosRow}>
        <ModuleButton
          label="Pedidos"
          subtitle="Revisar y confirmar"
          icon="clipboard-list-outline"
          color={C.primary}
          colorLight={C.primaryLight}
          onPress={() => navigation.navigate(ROUTES.PEDIDOS_LIST)}
        />
        <ModuleButton
          label="Despacho"
          subtitle="Picking y escaneo"
          icon="package-variant-closed"
          color={C.success}
          colorLight={C.successLight}
          onPress={() => navigation.navigate(ROUTES.DESPACHO_LIST)}
        />
      </View>

      <View style={[styles.modulosRow, { marginTop: S.md }]}>
        <ModuleButton
          label="Códigos de barra"
          subtitle="Identificar y asociar"
          icon="barcode-scan"
          color={C.info}
          colorLight={C.infoLight}
          onPress={() => navigation.navigate(ROUTES.ITEM_BARCODE)}
        />
      </View>

      {/* Admin/Manager: usuarios activos + botón de dashboard completo */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <>
          <View style={[styles.activosCard, shadow.sm]}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={C.primaryDim} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activosLabel}>USUARIOS ACTIVOS AHORA</Text>
              <Text style={styles.activosValue}>
                {summary.active_users !== null ? summary.active_users : '—'} en línea
              </Text>
            </View>
          </View>

          <ModuleButton
            label="Métricas"
            subtitle="Dashboard y análisis"
            icon="chart-bar"
            color={C.info}
            colorLight={C.infoLight}
            onPress={() => navigation.navigate(ROUTES.DASHBOARD)}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxxl, gap: 0 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: S.xl,
    paddingTop: S.sm,
  },
  greeting: { fontSize: 14, color: C.textSec, fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5, marginTop: 2 },
  userMeta: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: C.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginTop: S.xs,
  },

  // Sección
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  seccionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  errorInline: { fontSize: 11, color: C.danger, fontWeight: '600' },

  // KPI grid 2×2
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.md,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: S.base,
    gap: S.xs,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.xs,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 38,
  },

  // Módulos
  modulosRow: { flexDirection: 'row', gap: S.md },
  modulo: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: S.base,
    gap: S.xs,
  },
  moduloIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.xs,
  },
  moduloLabel: { fontSize: 16, fontWeight: '700', color: C.text },
  moduloSub: { fontSize: 12, color: C.textSec },

  // Usuarios activos
  activosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: S.base,
    marginTop: S.md,
  },
  activosLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  activosValue: { fontSize: 15, fontWeight: '600', color: C.text, marginTop: 2 },
});
