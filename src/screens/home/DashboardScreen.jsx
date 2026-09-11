import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '../../hooks/useDashboard';
import { C, S, shadow } from '../../constants/theme';

const W = Dimensions.get('window').width;
const CHART_W = W - S.base * 2 - S.md * 2; // scroll padding + card padding

// ── Utilidades ────────────────────────────────────────────────────────────────
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
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
  received:    C.primaryDim,
  reviewing:   C.info,
  confirmed:   C.success,
  partial:     C.warn,
  rejected:    C.danger,
  dispatched:  C.primary,
};

const STATUS_LABELS = {
  received:    'Recibida',
  reviewing:   'En revisión',
  confirmed:   'Confirmada',
  partial:     'Parcial',
  rejected:    'Rechazada',
  dispatched:  'Despachada',
};

const DISPATCH_STATUS_COLORS = {
  completed:   C.success,
  in_progress: C.warn,
  cancelled:   C.danger,
};

const DISPATCH_STATUS_LABELS = {
  completed:   'Completados',
  in_progress: 'En progreso',
  cancelled:   'Cancelados',
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
      <View style={styles.chartCardClip}>
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

function DispatchStatusPill({ status, total }) {
  const color = DISPATCH_STATUS_COLORS[status] ?? C.textSec;
  const label = DISPATCH_STATUS_LABELS[status] ?? capitalize(status.replace('_', ' '));
  return (
    <View style={[styles.dsPill, { borderColor: color + '40', backgroundColor: color + '12' }]}>
      <View style={[styles.dsPillDot, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.dsPillTotal, { color }]}>{total}</Text>
        <Text style={styles.dsPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

function DispatchStatsRow({ row, idx }) {
  return (
    <>
      {idx > 0 && <View style={styles.tableDividerLight} />}
      <View style={styles.dsRow}>
        <View style={styles.opAvatar}>
          <MaterialCommunityIcons name="account" size={14} color={C.primaryDim} />
        </View>
        <Text style={styles.dsUserId} numberOfLines={1}>{row.user_id}</Text>
        <Text style={styles.dsStat}>{row.dispatches_completed}</Text>
        <Text style={styles.dsStat}>
          {row.avg_duration_minutes != null ? `${row.avg_duration_minutes.toFixed(1)}m` : '—'}
        </Text>
        <Text style={styles.dsStat}>{row.total_units_dispatched ?? '—'}</Text>
      </View>
    </>
  );
}

function OperatorRow({ op, idx }) {
  return (
    <>
      {idx > 0 && <View style={styles.tableDividerLight} />}
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
    </>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { metrics, warehouseFilter, changeWarehouse, isAdmin, user, loading, refreshing, error, onRefresh } =
    useDashboard();

  const { summary, ordersByStatus, reviewTime, dispatches, dispatchStatus, volume, operators, sessions } = metrics;

  const donutData     = buildDonutData(ordersByStatus ?? []);
  const reviewData    = buildLineData(volume ?? [], 'order_review');
  const confirmedData = buildLineData(volume ?? [], 'order_confirmed');
  const dispatchData  = buildLineData(volume ?? [], 'dispatch_complete');
  const reviewBars    = buildReviewTimeBars(reviewTime ?? []);
  const opGroups      = groupByOperator(operators ?? []);

  const lineEmpty    = reviewData.length === 0 && confirmedData.length === 0;
  const donutEmpty   = donutData.length === 0;
  const revBarEmpty  = reviewBars.length === 0;

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

      {/* Selector de almacén */}
      {showFilter && (
        <View style={styles.filterRow}>
          <WarehouseChip label="Todos" active={warehouseFilter === null} onPress={() => changeWarehouse(null)} />
          {whCodes.map((wh) => (
            <WarehouseChip key={wh} label={`WH ${wh}`} active={warehouseFilter === wh} onPress={() => changeWarehouse(wh)} />
          ))}
        </View>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <SeccionLabel>RESUMEN DE HOY</SeccionLabel>
      <View style={styles.kpiGrid}>
        <KpiCard label="Pendientes"    value={summary.orders_pending}   icon="clipboard-clock-outline"  color={C.warn}       colorLight={C.warnLight} />
        <KpiCard label="Confirmadas"   value={summary.orders_confirmed} icon="clipboard-check-outline"  color={C.success}    colorLight={C.successLight} />
        <KpiCard label="Órdenes hoy"   value={summary.orders_today}     icon="calendar-today"           color={C.primary}    colorLight={C.primaryLight} />
        <KpiCard label="Despachos hoy" value={summary.dispatches_today} icon="truck-fast-outline"       color={C.primaryDim} colorLight={C.primaryLight} />
      </View>
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

      {/* ── Actividad diaria ──────────────────────────────────────────────── */}
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

      {/* ── Órdenes por estado ────────────────────────────────────────────── */}
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

      {/* ── Despachos — estado + rendimiento ─────────────────────────────── */}
      {(dispatchStatus?.length ?? 0) > 0 && (
        <>
          <SeccionLabel>ESTADO DE DESPACHOS</SeccionLabel>
          <View style={styles.dsPillRow}>
            {dispatchStatus.map((ds) => (
              <DispatchStatusPill key={ds.status} status={ds.status} total={ds.total} />
            ))}
          </View>
        </>
      )}

      {(dispatches?.length ?? 0) > 0 && (
        <>
          <SeccionLabel>RENDIMIENTO POR OPERADOR</SeccionLabel>
          <View style={[styles.tableCard, shadow.sm]}>
            <View style={styles.tableCardClip}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>USUARIO</Text>
                <Text style={styles.tableHeaderCell}>DESP.</Text>
                <Text style={styles.tableHeaderCell}>PROM.</Text>
                <Text style={styles.tableHeaderCell}>UNIDADES</Text>
              </View>
              <View style={styles.tableDivider} />
              {dispatches.map((row, idx) => (
                <DispatchStatsRow key={row.user_id} row={row} idx={idx} />
              ))}
            </View>
          </View>
        </>
      )}

      {/* ── Tiempo de revisión ────────────────────────────────────────────── */}
      <SeccionLabel>TIEMPO PROMEDIO DE REVISIÓN</SeccionLabel>
      <ChartCard title="Por almacén (minutos)" empty={revBarEmpty}>
        {!revBarEmpty && (
          <BarChart
            data={reviewBars}
            horizontal
            barWidth={28}
            barBorderRadius={6}
            frontColor={C.info}
            labelStyle={{ color: C.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: C.textMuted, fontSize: 10 }}
            noOfSections={4}
            width={CHART_W}
            height={Math.max(reviewBars.length * 48, 80)}
            backgroundColor={C.surface}
            yAxisColor="transparent"
            xAxisColor={C.border}
            isAnimated
          />
        )}
      </ChartCard>

      {/* ── Actividad por operador ────────────────────────────────────────── */}
      {opGroups.length > 0 && (
        <>
          <SeccionLabel>ACTIVIDAD POR OPERADOR</SeccionLabel>
          <View style={[styles.tableCard, shadow.sm]}>
            <View style={styles.tableCardClip}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>USUARIO</Text>
                <Text style={styles.tableHeaderCell}>ACCIONES</Text>
                <Text style={styles.tableHeaderCell}>ERRORES</Text>
              </View>
              <View style={styles.tableDivider} />
              {opGroups.map((op, idx) => (
                <OperatorRow key={op.userId} op={op} idx={idx} />
              ))}
            </View>
          </View>
        </>
      )}

      {/* ── Sesiones activas ──────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <>
          <SeccionLabel>SESIONES ACTIVAS</SeccionLabel>
          <View style={[styles.sessionsCard, shadow.sm]}>
            <View style={styles.sessionsCardClip}>
              {sessions.map((s, idx) => (
                <View key={s.id}>
                  {idx > 0 && <View style={styles.tableDividerLight} />}
                  <SessionCard session={s} />
                </View>
              ))}
            </View>
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

  // Chart cards — outer has shadow/borderRadius, inner clips content
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
  },
  chartCardClip: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: S.md,
    gap: S.md,
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
  legend: { flex: 1, gap: 8, minWidth: 120 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: C.textSec, flex: 1 },
  legendVal: { fontSize: 13, fontWeight: '700', color: C.text },

  // Table cards — outer has shadow/borderRadius, inner clips rows
  tableCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
  },
  tableCardClip: {
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

  // Operator activity rows
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

  // Dispatch status pills
  dsPillRow: { flexDirection: 'row', gap: S.md, flexWrap: 'wrap' },
  dsPill: {
    flex: 1,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.surface,
  },
  dsPillDot: { width: 8, height: 8, borderRadius: 4 },
  dsPillTotal: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  dsPillLabel: { fontSize: 10, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Dispatch stats table rows
  dsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.base,
    paddingVertical: 12,
    gap: S.sm,
  },
  dsUserId: { flex: 2, fontSize: 13, fontWeight: '600', color: C.text },
  dsStat: { flex: 1, fontSize: 13, fontWeight: '600', color: C.primaryDim, textAlign: 'right' },

  // Sessions card
  sessionsCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
  },
  sessionsCardClip: {
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
