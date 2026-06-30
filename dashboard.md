# Dashboard — Guía de implementación frontend

Referencia específica para construir el módulo de dashboard en **React Native + Expo**.
Complementa `frontend.md` (que cubre todos los endpoints). Este documento se enfoca solo en
las pantallas de métricas, la librería de charts y las transformaciones de datos necesarias.

---

## Librería recomendada: `react-native-gifted-charts`

```bash
npm install react-native-gifted-charts react-native-linear-gradient react-native-svg
```

### Por qué esta librería
| Criterio | react-native-gifted-charts |
|---|---|
| Charts disponibles | Bar, Line, Pie, Donut, Area, Stacked Bar |
| Performance | Usa `react-native-svg`, sin WebView |
| Personalización | Colores, tooltips, gradientes, etiquetas internas |
| Mantenimiento | Activo en 2025, bien documentado |
| Tamaño | ~130 KB |

---

## Endpoint principal del dashboard

### `GET /metrics/all`
Un solo call que devuelve todos los datos necesarios para el dashboard completo.
Úsalo en lugar de hacer 7 llamadas paralelas.

**Query param opcional:** `?warehouseCode=01`  
Admin puede filtrar por almacén. Operator siempre ve solo el suyo (el param se ignora).

**Response shape completo:**
```ts
interface MetricsAll {
  summary:        DashboardSummary;
  ordersByStatus: OrderStatusRow[];
  reviewTime:     ReviewTimeRow[];
  dispatches:     DispatchByOperatorRow[];
  volume:         VolumeRow[];
  operators:      OperatorActivityRow[];
  sessions:       ActiveSession[];
}

interface DashboardSummary {
  orders_pending:   number;   // received + reviewing
  orders_confirmed: number;   // confirmed + partial
  orders_today:     number;   // creadas hoy
  active_users:     number;   // sesiones activas ahora
  dispatches_today: number;   // dispatch_complete hoy
}

interface OrderStatusRow {
  warehouse_code: string;
  status:         'received' | 'reviewing' | 'confirmed' | 'partial' | 'rejected' | 'dispatched';
  total:          number;
}

interface ReviewTimeRow {
  warehouse_code: string;
  avg_minutes:    number;   // float — corregido en backend
  total_reviewed: number;
}

interface DispatchByOperatorRow {
  user_id:              string;
  warehouse_code:       string;
  dispatches_completed: number;
  first_dispatch:       string;  // ISO 8601
  last_dispatch:        string;  // ISO 8601
}

interface VolumeRow {
  day:            string;   // 'YYYY-MM-DD'
  action:         string;
  warehouse_code: string;
  total:          number;
  errors:         number;
}

interface OperatorActivityRow {
  user_id:        string;
  warehouse_code: string;
  action:         string;
  total:          number;
  errors:         number;
  avg_ms:         number | null;   // integer — corregido en backend
}

interface ActiveSession {
  id:             string;
  user_id:        string;
  name:           string;
  role:           string;
  warehouse_code: string;
  ip_address:     string | null;
  created_at:     string;
  last_seen_at:   string;
  expires_at:     string;
}
```

---

## Estructura de pantallas del dashboard

```
Dashboard (Tab o Stack desde Home)
  ├── KPI Cards (5 tarjetas de resumen)            ← summary
  ├── Actividad diaria — LineChart                 ← volume
  ├── Órdenes por estado — DonutChart              ← ordersByStatus
  ├── Despachos por operador — BarChart            ← dispatches
  ├── Tiempo de revisión — BarChart horizontal     ← reviewTime
  ├── Actividad por operador — FlatList/Table      ← operators
  └── Sesiones activas — FlatList                  ← sessions
```

Carga todos los datos en un solo `useEffect` llamando `GET /metrics/all`.
Refresca cada 60 segundos con `setInterval`.

```ts
const [data, setData] = useState<MetricsAll | null>(null);

useEffect(() => {
  const load = async () => {
    const res = await apiCall<{ data: MetricsAll }>('/metrics/all');
    setData(res.data);
  };
  load();
  const timer = setInterval(load, 60_000);
  return () => clearInterval(timer);
}, [warehouseFilter]);
```

---

## Transformaciones por chart

### 1. KPI Cards — `summary`

Sin transformación. Leer directamente los campos del objeto.

```tsx
<KpiCard label="Pendientes"   value={data.summary.orders_pending}   color="#eab308" />
<KpiCard label="Confirmadas"  value={data.summary.orders_confirmed}  color="#22c55e" />
<KpiCard label="Órdenes hoy"  value={data.summary.orders_today}      color="#22d3ee" />
<KpiCard label="Usuarios"     value={data.summary.active_users}      color="#6366f1" />
<KpiCard label="Despachos hoy" value={data.summary.dispatches_today} color="#22c55e" />
```

---

### 2. Actividad diaria — `LineChart` (volume)

Los datos llegan planos (un row por día+acción). Hay que agrupar por día y separar por acción.

```ts
const STATUS_COLORS: Record<string, string> = {
  order_review:      '#6366f1',
  order_confirmed:   '#22c55e',
  dispatch_complete: '#22d3ee',
};

function buildLineData(volume: VolumeRow[], action: string) {
  const days = [...new Set(volume.map(r => r.day))].sort();
  return days.map(day => {
    const row = volume.find(r => r.day === day && r.action === action);
    return {
      value: row?.total ?? 0,
      label: day.slice(5),          // 'MM-DD'
      dataPointText: String(row?.total ?? 0)
    };
  });
}

const reviewData   = buildLineData(data.volume, 'order_review');
const confirmedData = buildLineData(data.volume, 'order_confirmed');
const dispatchData = buildLineData(data.volume, 'dispatch_complete');
```

```tsx
import { LineChart } from 'react-native-gifted-charts';

<LineChart
  data={reviewData}
  data2={confirmedData}
  data3={dispatchData}
  color1="#6366f1"
  color2="#22c55e"
  color3="#22d3ee"
  thickness={2}
  curved
  areaChart
  startFillColor1="#6366f130"
  startFillColor2="#22c55e30"
  startFillColor3="#22d3ee30"
  endFillColor1="#6366f100"
  endFillColor2="#22c55e00"
  endFillColor3="#22d3ee00"
  yAxisTextStyle={{ color: '#64748b', fontSize: 11 }}
  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
  noOfSections={4}
  width={screenWidth - 64}
/>
```

---

### 3. Órdenes por estado — `PieChart` / `DonutChart` (ordersByStatus)

Los datos vienen por `warehouse_code + status`. Hay que agregar por status si se muestran todos.

```ts
const STATUS_COLORS: Record<string, string> = {
  received:   '#64748b',
  reviewing:  '#22d3ee',
  confirmed:  '#22c55e',
  partial:    '#eab308',
  rejected:   '#ef4444',
  dispatched: '#6366f1',
};

function buildDonutData(rows: OrderStatusRow[]) {
  const totals: Record<string, number> = {};
  rows.forEach(r => { totals[r.status] = (totals[r.status] ?? 0) + r.total; });
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      value,
      color:     STATUS_COLORS[status] ?? '#888',
      text:      String(value),
      label:     capitalize(status),
      focused:   status === 'confirmed',
    }));
}
```

```tsx
import { PieChart } from 'react-native-gifted-charts';

<PieChart
  donut
  data={buildDonutData(data.ordersByStatus)}
  innerRadius={60}
  radius={100}
  centerLabelComponent={() => (
    <Text style={{ color: '#e2e8f0', fontSize: 20, fontWeight: '700' }}>
      {data.summary.orders_pending + data.summary.orders_confirmed}
    </Text>
  )}
/>
```

---

### 4. Despachos por operador — `BarChart` (dispatches)

```ts
function buildDispatchBars(rows: DispatchByOperatorRow[]) {
  return rows.map(r => ({
    value:       r.dispatches_completed,
    label:       r.user_id,
    frontColor:  '#6366f1',
    topLabelComponent: () => (
      <Text style={{ color: '#e2e8f0', fontSize: 11 }}>{r.dispatches_completed}</Text>
    )
  }));
}
```

```tsx
import { BarChart } from 'react-native-gifted-charts';

<BarChart
  data={buildDispatchBars(data.dispatches)}
  barWidth={40}
  barBorderRadius={6}
  frontColor="#6366f1"
  yAxisTextStyle={{ color: '#64748b', fontSize: 11 }}
  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 11 }}
  noOfSections={4}
  width={screenWidth - 64}
/>
```

---

### 5. Tiempo de revisión — `BarChart` horizontal (reviewTime)

```ts
function buildReviewTimeBars(rows: ReviewTimeRow[]) {
  return rows.map(r => ({
    value:      r.avg_minutes,
    label:      `WH ${r.warehouse_code}`,
    frontColor: '#22d3ee',
    topLabelComponent: () => (
      <Text style={{ color: '#e2e8f0', fontSize: 11 }}>{r.avg_minutes} min</Text>
    )
  }));
}
```

```tsx
<BarChart
  data={buildReviewTimeBars(data.reviewTime)}
  horizontal              // ← barra horizontal
  barWidth={28}
  barBorderRadius={6}
  frontColor="#22d3ee"
  yAxisTextStyle={{ color: '#64748b', fontSize: 11 }}
  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 11 }}
  width={screenWidth - 64}
/>
```

---

### 6. Actividad por operador — `FlatList` (operators)

Sin chart, mostrar como tabla. Agrupar por `user_id` si se quiere una card por operador.

```ts
// Agrupar por operador para mostrar resumen por persona
function groupByOperator(rows: OperatorActivityRow[]) {
  const map: Record<string, { total: number; errors: number; actions: string[] }> = {};
  rows.forEach(r => {
    if (!map[r.user_id]) map[r.user_id] = { total: 0, errors: 0, actions: [] };
    map[r.user_id].total  += r.total;
    map[r.user_id].errors += r.errors;
    map[r.user_id].actions.push(r.action);
  });
  return Object.entries(map).map(([userId, v]) => ({ userId, ...v }));
}
```

Columnas a mostrar en cada fila: `user_id`, `action`, `total`, `errors`, `avg_ms` (usar `formatMs` de abajo).

---

### 7. Sesiones activas — `FlatList` (sessions)

Sin chart. Mostrar como lista de cards con: nombre, rol, almacén, última actividad, estado online.

```ts
function formatRelTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1)  return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin}m`;
  return `hace ${Math.round(diffMin / 60)}h`;
}
```

---

## Utilidades comunes

```ts
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  const m = Math.floor(ms / 60_000);
  if (m >= 1) return `${m}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_LABELS: Record<string, string> = {
  received:   'Recibida',
  reviewing:  'En revisión',
  confirmed:  'Confirmada',
  partial:    'Parcial',
  rejected:   'Rechazada',
  dispatched: 'Despachada',
};
```

---

## Cambios en endpoints vs `frontend.md` original

| Cambio | Detalle |
|---|---|
| `GET /metrics/all` (**nuevo**) | Reemplaza 7 llamadas individuales. Usar este para el dashboard. |
| `avg_minutes` ahora es `number` | Antes llegaba como string por tipo NUMERIC en Postgres. Ya corregido en backend. |
| `avg_ms` ahora es `number` | Mismo caso, ya corregido. |
| `GET /metrics/volume` default 30 días | Bug corregido: antes el parámetro default fallaba. Ahora funciona sin `from`/`to`. |
| `GET /orders/:id/review` ya no asigna availability | Ver `frontend.md` — ítems quedan en `pending` hasta que el operario escanea. |
| `POST /orders/:id/items/scan` (**nuevo**) | Endpoint de escaneo durante picking. Ver `frontend.md`. |
| `GET /dispatch/invoices` (**nuevo**) | Lista facturas SAP abiertas para el almacén. Reemplaza el input manual de docNum. |

---

## Notas de implementación

- **`screenWidth`**: importar de `react-native` (`Dimensions.get('window').width`). Restar padding (ej: 64) para que el chart no desborde.
- **Admin con múltiples almacenes**: mostrar un `Picker` o `SegmentedControl` con opciones "Todos / WH 01 / WH 02". Al cambiar, pasar `?warehouseCode=XX` en la llamada a `/metrics/all`.
- **Operator**: no mostrar el selector de almacén; el backend filtra automáticamente.
- **Sin datos**: cuando `data.length === 0` (ej: dispatches vacío), mostrar un texto "Sin actividad registrada" en lugar del chart para no crashear gifted-charts con arrays vacíos.
- **Refreshing visual**: usar `RefreshControl` de `ScrollView` para pull-to-refresh manual además del auto-refresh de 60s.
