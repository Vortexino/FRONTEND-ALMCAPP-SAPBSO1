import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '../../hooks/useDashboard';
import { C, S, shadow } from '../../constants/theme';

const W = Dimensions.get('window').width;
const CHART_W = W - S.base * 2 - S.md * 2 - 2; // ancho disponible dentro de la card con padding

// ── Utilidades ────────────────────────────────────────────────────────────────
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function formatMs(ms) {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60_000);
  if (m >= 1) return `${m}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelTime(iso) {
  if (!iso) return '—';
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1)  return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin}m`;
  return `hace ${Math.round(diffMin / 60)}h`;
}

// ── Transformaciones de datos ─────────────────────────────────────────────────
const STATUS_COLORS = {
  received:   C.primaryDim,
  reviewing:  C.info,
  confirmed:  C.success,
  partial:    C.warn,
  rejected:   C.danger,
  dispatched: C.primary,
};

const STATUS_LABELS = {
  received:   'Recibida',
  reviewing:  'En revisión',
  confirmed:  'Confirmada',
  partial:    'Parcial',
  rejected:   'Rechazada',
  dispatched: 'Despachada',
};

function buildDonutData(rows) {
  const totals = {};
  rows.forEach((r) => { totals[r.status] = (totals[r.status] ?? 0) + r.total; });
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      value,
      color:   STATUS_COLORS[status] ?? C.textSec,
      text:    String(value),
      label:   STATUS_LABELS[status] ?? capitalize(status),
      focused: status === 'confirmed',
    }));
}

function buildLineData(volume, action) {
  const days = [...new Set(volume.map((r) => r.day))].sort();
  return days.map((day) => {
    const row = volume.find((r) => r.day === day && r.action === action);
    return {
      value:         row?.total ?? 0,
      label:         day.slice(5), // 'MM-DD'
      dataPointText: String(row?.total ?? 0),
    };
  });
}

function buildDispatchBars(rows) {
  return rows.map((r) => ({
    value:      r.dispatches_completed,
    label:      r.user_id,
    frontColor: C.primaryDim,
  }));
}

function buildReviewTimeBars(rows) {
  return rows.map((r) => ({
    value:      Math.round(r.avg_minutes * 10) / 10,
    label:      `WH ${r.warehouse_code}`,
    frontColor: C.info,
  }));
}

function groupByOperator(rows) {
  const map = {};
  rows.forEach((r) => {
    if (!map[r.user_id]) map[r.user_id] = { total: 0, errors: 0, actions: [] };
    map[r.user_id].total  += r.total;
    map[r.user_id].errors += r.errors;
    if (!map[r.user_id].actions.includes(r.action)) map[r.user_id].actions.push(r.action);
  });
  return Object.entries(map).map(([userId, v]) => ({ userId, ...v }));
}

// ── Componentes locales ───────────────────────────────────────────────────────
function SeccionLabel({ children }) {
  return <Text style={styles.seccionLabel}>{children}</Text>;
}

function ChartCard({ title, children, empty, emptyMsg = 'Sin actividad registrada' }) {
  return (
    <View style={[styles.chartCard, shadow.sm]}>
      <Text style={styles.chartTitle}>{title}</Text>
      {empty ? (
        <View style={styles.emptyChart}>
          <MaterialCommunityIcons name="chart-line" size={24} color={C.textMuted} />
          <Text style={styles.emptyChartText}>{emptyMsg}</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

function KpiCard({ label, value, icon, color, colorLight }) {
  return (
    <View style={[styles.kpiCard, shadow.sm]}>
      <View style={[styles.kpiIcon, { backgroundColor: colorLight }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>
        {value !== null && value !== undefined ? String(value) : '—'}
      </Text>
    </View>
  );
}

function WarehouseChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function DonutLegend({ data }) {
  return (
    <View style={styles.legend}>
      {data.map((item) => (
        <View key={item.label} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
          <Text style={styles.legendVal}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function SessionCard({ session }) {
  const roleColor = { admin: C.danger, manager: C.warn, operator: C.primary }[session.role] ?? C.textSec;
  return (
    <View style={styles.sessionRow}>
      <View style={[styles.sessionAvatar, { backgroundColor: roleColor + '18' }]}>
        <Text style={[styles.sessionAvatarText, { color: roleColor }]}>
          {session.name?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sessionName}>{session.name}</Text>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionMetaText}>
            {session.role?.toUpperCase()} · WH {session.warehouse_code}
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.sessionMetaText}>{formatRelTime(session.last_seen_at)}</Text>
        </View>
      </View>
      <View style={styles.onlineDot} />
    </View>
  );
}

function OperatorRow({ op }) {
  return (
    <View style={styles.opRow}>
      <View style={styles.opAvatar}>
        <MaterialCommunityIcons name="account" size={14} color={C.primaryDim} />
      </View>
      <Text style={styles.opId} numberOfLines={1}>{op.userId}</Text>
      <View style={styles.opStats}>
        <Text style={styles.opTotal}>{op.total}</Text>
        {op.errors > 0 && (
          <View style={styles.opErrorBadge}>
            <Text style={styles.opErrorText}>{op.errors} err</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { metrics, warehouseFilter, changeWarehouse, isAdmin, user, loading, refreshing, error, onRefresh } =
    useDashboard();

  const { summary, ordersByStatus, reviewTime, dispatches, volume, operators, sessions } = metrics;

  // Data calculada
  const donutData    = buildDonutData(ordersByStatus ?? []);
  const reviewData   = buildLineData(volume ?? [], 'order_review');
  const confirmedData = buildLineData(volume ?? [], 'order_confirmed');
  const dispatchData = buildLineData(volume ?? [], 'dispatch_complete');
  const dispatchBars = buildDispatchBars(dispatches ?? []);
  const reviewBars   = buildReviewTimeBars(reviewTime ?? []);
  const opGroups     = groupByOperator(operators ?? []);

  const lineEmpty   = reviewData.length === 0 && confirmedData.length === 0;
  const donutEmpty  = donutData.length === 0;
  const barEmpty    = dispatchBars.length === 0;
  const revBarEmpty = reviewBars.length === 0;

  // Almacenes del usuario (para el selector)
  const whCodes = user?.warehouseCodes ?? [];
  const showFilter = isAdmin && whCodes.length > 1;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
      }
    >
      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={13} color={C.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Selector de almacén (solo admin/manager con múltiples) */}
      {showFilter && (
        <View style={styles.filterRow}>
          <WarehouseChip label="Todos" active={warehouseFilter === null} onPress={() => changeWarehouse(null)} />
          {whCodes.map((wh) => (
            <WarehouseChip key={wh} label={`WH ${wh}`} active={warehouseFilter === wh} onPress={() => changeWarehouse(wh)} />
          ))}
        </View>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <SeccionLabel>RESUMEN DE HOY</SeccionLabel>
      <View style={styles.kpiGrid}>
        <KpiCard label="Pendientes"    value={summary.orders_pending}   icon="clipboard-clock-outline"  color={C.warn}       colorLight={C.warnLight} />
        <KpiCard label="Confirmadas"   value={summary.orders_confirmed} icon="clipboard-check-outline"  color={C.success}    colorLight={C.successLight} />
        <KpiCard label="Órdenes hoy"   value={summary.orders_today}     icon="calendar-today"           color={C.primary}    colorLight={C.primaryLight} />
        <KpiCard label="Despachos hoy" value={summary.dispatches_today} icon="truck-fast-outline"       color={C.primaryDim} colorLight={C.primaryLight} />
      </View>
      {/* active_users — fila completa */}
      {(isAdmin || user?.role === 'manager') && (
        <View style={[styles.activosCard, shadow.sm]}>
          <View style={[styles.activosIconBox, { backgroundColor: C.infoLight }]}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color={C.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activosLabel}>USUARIOS EN LÍNEA AHORA</Text>
            <Text style={styles.activosVal}>{summary.active_users !== null ? summary.active_users : '—'} sesiones activas</Text>
          </View>
        </View>
      )}

      {/* ── Actividad diaria ─────────────────────────────────────────────── */}
      <SeccionLabel>ACTIVIDAD DE LOS ÚLTIMOS DÍAS</SeccionLabel>
      <ChartCard title="Revisiones · Confirmaciones · Despachos" empty={lineEmpty}>
        {!lineEmpty && (
          <>
            <LineChart
              data={reviewData}
              data2={confirmedData}
              data3={dispatchData}
              color1={C.primaryDim}
              color2={C.success}
              color3={C.warn}
              thickness={2}
              curved
              areaChart
              startFillColor1={C.primaryDim + '28'}
              startFillColor2={C.success + '28'}
              startFillColor3={C.warn + '28'}
              endFillColor1={C.primaryDim + '00'}
              endFillColor2={C.success + '00'}
              endFillColor3={C.warn + '00'}
              yAxisTextStyle={{ color: C.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: C.textMuted, fontSize: 9 }}
              noOfSections={4}
              width={CHART_W}
              hideDataPoints
              backgroundColor={C.surface}
              yAxisColor="transparent"
              xAxisColor={C.border}
              initialSpacing={8}
            />
            <View style={styles.lineLegend}>
              {[
                { color: C.primaryDim, label: 'Revisiones' },
                { color: C.success,    label: 'Confirmadas' },
                { color: C.warn,       label: 'Despachos' },
              ].map((l) => (
                <View key={l.label} style={styles.lineLegendItem}>
                  <View style={[styles.lineLegendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.lineLegendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ChartCard>

      {/* ── Órdenes por estado ───────────────────────────────────────────── */}
      <SeccionLabel>ÓRDENES POR ESTADO</SeccionLabel>
      <ChartCard title="Distribución actual" empty={donutEmpty}>
        {!donutEmpty && (
          <View style={styles.donutRow}>
            <PieChart
              donut
              data={donutData}
              innerRadius={54}
              radius={86}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.donutCenter}>
                    {(summary.orders_pending ?? 0) + (summary.orders_confirmed ?? 0)}
                  </Text>
                  <Text style={styles.donutCenterSub}>total</Text>
                </View>
              )}
              focusOnPress
            />
            <DonutLegend data={donutData} />
          </View>
        )}
      </ChartCard>

      {/* ── Despachos por operador ───────────────────────────────────────── */}
      <SeccionLabel>DESPACHOS POR OPERADOR</SeccionLabel>
      <ChartCard title="Completados en el período" empty={barEmpty}>
        {!barEmpty && (
          <BarChart
            data={dispatchBars}
            barWidth={40}
            barBorderRadius={8}
            frontColor={C.primaryDim}
            yAxisTextStyle={{ color: C.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: C.textMuted, fontSize: 9 }}
            noOfSections={4}
            width={CHART_W}
            backgroundColor={C.surface}
            yAxisColor="transparent"
            xAxisColor={C.border}
            isAnimated
            initialSpacing={12}
          />
        )}
      </ChartCard>

      {/* ── Tiempo de revisión ───────────────────────────────────────────── */}
      <SeccionLabel>TIEMPO PROMEDIO DE REVISIÓN</SeccionLabel>
      <ChartCard title="Por almacén (minutos)" empty={revBarEmpty}>
        {!revBarEmpty && (
          <BarChart
            data={reviewBars}
            horizontal
            barWidth={28}
            barBorderRadius={6}
            frontColor={C.info}
            yAxisTextStyle={{ color: C.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: C.textMuted, fontSize: 9 }}
            width={CHART_W}
            backgroundColor={C.surface}
            yAxisColor="transparent"
            xAxisColor={C.border}
            isAnimated
          />
        )}
      </ChartCard>

      {/* ── Actividad por operador ───────────────────────────────────────── */}
      {opGroups.length > 0 && (
        <>
          <SeccionLabel>ACTIVIDAD POR OPERADOR</SeccionLabel>
          <View style={[styles.tableCard, shadow.sm]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>USUARIO</Text>
              <Text style={styles.tableHeaderCell}>ACCIONES</Text>
              <Text style={styles.tableHeaderCell}>ERRORES</Text>
            </View>
            <View style={styles.tableDivider} />
            {opGroups.map((op, idx) => (
              <View key={op.userId}>
                {idx > 0 && <View style={styles.tableDividerLight} />}
                <OperatorRow op={op} />
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Sesiones activas ─────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <>
          <SeccionLabel>SESIONES ACTIVAS</SeccionLabel>
          <View style={[styles.sessionsCard, shadow.sm]}>
            {sessions.map((s, idx) => (
              <View key={s.id}>
                {idx > 0 && <View style={styles.tableDividerLight} />}
                <SessionCard session={s} />
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: S.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.base, gap: S.md },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    backgroundColor: C.dangerLight,
    padding: S.md,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, color: C.danger, flex: 1 },

  // Filtro de almacén
  filterRow: {
    flexDirection: 'row',
    gap: S.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipLabel: { fontSize: 12, fontWeight: '600', color: C.textSec },
  chipLabelActive: { color: '#fff' },

  // Sección label
  seccionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginTop: S.xs,
  },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.md,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: S.base,
    gap: S.xs,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.xs,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: C.textMuted, textTransform: 'uppercase' },
  kpiValue: { fontSize: 32, fontWeight: '700', letterSpacing: -1, lineHeight: 36 },

  activosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: S.base,
  },
  activosIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activosLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: C.textMuted, textTransform: 'uppercase' },
  activosVal: { fontSize: 15, fontWeight: '600', color: C.text, marginTop: 2 },

  // Chart cards
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: S.md,
    gap: S.md,
    overflow: 'hidden',
  },
  chartTitle: { fontSize: 13, fontWeight: '600', color: C.textSec },
  emptyChart: { alignItems: 'center', paddingVertical: S.xl, gap: S.sm },
  emptyChartText: { fontSize: 13, color: C.textMuted },

  // Line chart legend
  lineLegend: { flexDirection: 'row', gap: S.base, flexWrap: 'wrap', paddingTop: S.xs },
  lineLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lineLegendDot: { width: 8, height: 8, borderRadius: 4 },
  lineLegendLabel: { fontSize: 11, color: C.textSec, fontWeight: '500' },

  // Donut chart
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: S.base, flexWrap: 'wrap' },
  donutCenter: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  donutCenterSub: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: C.textSec, flex: 1 },
  legendVal: { fontSize: 13, fontWeight: '700', color: C.text },

  // Operators table
  tableCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: S.base,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  tableDivider: { height: 0.5, backgroundColor: C.border },
  tableDividerLight: { height: 0.5, backgroundColor: C.border, marginHorizontal: S.base },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.base,
    paddingVertical: 12,
    gap: S.sm,
  },
  opAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opId: { flex: 2, fontSize: 13, fontWeight: '600', color: C.text },
  opStats: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.xs, justifyContent: 'flex-end' },
  opTotal: { fontSize: 15, fontWeight: '700', color: C.primary },
  opErrorBadge: {
    backgroundColor: C.dangerLight,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  opErrorText: { fontSize: 10, fontWeight: '700', color: C.danger },

  // Sessions
  sessionsCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.base,
    gap: S.md,
  },
  sessionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionAvatarText: { fontSize: 15, fontWeight: '700' },
  sessionName: { fontSize: 14, fontWeight: '600', color: C.text },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: S.xs, marginTop: 2 },
  sessionMetaText: { fontSize: 11, color: C.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
});
