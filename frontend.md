# Frontend API Reference — AlmcApp

Documento de referencia para construir el frontend en **React Native + Expo**.
Cubre todos los endpoints, shapes de datos, flujos de pantalla y comportamientos esperados.

---

## Configuración base

```ts
const BASE_URL = 'http://<IP_SERVIDOR>:3000';

// Todos los requests autenticados llevan este header:
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

> En Expo con Metro Bundler en Android emulador usar `http://10.0.2.2:3000`.
> En dispositivo físico usar la IP local del servidor.

### Almacenamiento del token (Expo)
```ts
import * as SecureStore from 'expo-secure-store';

// Guardar al login
await SecureStore.setItemAsync('auth_token', token);
await SecureStore.setItemAsync('auth_user', JSON.stringify(user));

// Leer en cada request
const token = await SecureStore.getItemAsync('auth_token');

// Borrar al logout
await SecureStore.deleteItemAsync('auth_token');
await SecureStore.deleteItemAsync('auth_user');
```

---

## Tipos TypeScript

```ts
// ── AUTH ──────────────────────────────────────────────────
interface User {
  userId: string;
  name: string;
  role: 'admin' | 'manager' | 'operator';
  warehouseCode: string;          // almacén activo en esta sesión
  warehouseCodes: string[];       // todos los almacenes del usuario (vacío = admin con acceso total)
  sessionId?: string;             // solo en GET /auth/me
}

// ── ÓRDENES ───────────────────────────────────────────────
type OrderStatus = 'received' | 'reviewing' | 'confirmed' | 'partial' | 'rejected' | 'dispatched';
type ItemAvailability = 'pending' | 'available' | 'needs_transfer' | 'unavailable';

interface OrderItem {
  id: string;
  orderId: string;
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  remainingQty: number;
  warehouseCode: string;
  availability: ItemAvailability;
  transferNote: string | null;
  sapStock: number | null;        // null si aún no se revisó
  reservedQty: number;
  netAvailable: number | null;    // sapStock - reservedQty; null si sin stock consultado
}

interface OrderProgress {
  total: number;
  available: number;
  transfer: number;
  pending: number;
}

interface OrderLock {
  lockedBy: string;               // userId del encargado que inició la revisión
  lockedAt: string;               // ISO 8601
  expiresAt: string;              // ISO 8601
}

interface Order {
  id: string;
  docEntry: number;               // ID interno SAP (ORDR)
  docNum: number;                 // Número de orden SAP visible para el usuario
  cardName: string;               // Nombre del cliente
  warehouseCode: string;
  docDate: string;                // ISO 8601 date
  docDueDate: string;             // Fecha límite de entrega
  status: OrderStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  progress: OrderProgress;
  items: OrderItem[];
  lock: OrderLock | null;         // null si no está bloqueada
}

interface AvailabilityItem {
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  quantity: number;               // cantidad requerida
  sapStock: number;               // stock total en SAP
  otherReserved: number;          // reservado por otras órdenes
  netAvailable: number;           // sapStock - otherReserved
  canFulfill: boolean;            // netAvailable >= quantity
  currentStatus: ItemAvailability;
}

// ── DESPACHO ──────────────────────────────────────────────
type DispatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface DispatchItem {
  itemCode: string;
  description: string;
  quantity: number;
  picked: number;
  remaining: number;
  binLocation: string | null;     // ubicación física en almacén
  completed: boolean;
}

interface DispatchInvoice {
  docEntry: number;
  docNum: number;
  warehouseCode: string;
  customerName: string;
  items: DispatchItem[];
  totalItems: number;             // suma de quantities
  totalPicked: number;            // suma de picked
  isFullyPicked: boolean;
}

interface Dispatch {
  id: string;
  userId: string;                 // encargado responsable (único que puede cerrar)
  warehouseId: string;
  invoice: DispatchInvoice;
  status: DispatchStatus;
  progress: number;               // porcentaje 0-100
  nextItem: DispatchItem | null;  // próximo ítem a escanear (null si completado)
  createdAt: string;
  updatedAt: string;
}

interface ScanResult {
  dispatchId: string;
  scanned: DispatchItem;
  nextItem: DispatchItem | null;
  isComplete: boolean;
  progress: number;               // porcentaje 0-100
}

// ── MÉTRICAS ──────────────────────────────────────────────
interface DashboardSummary {
  orders_pending: number;         // received + reviewing
  orders_confirmed: number;       // confirmed + partial
  orders_today: number;
  active_users: number;
  dispatches_today: number;
}

// ── ERRORES ───────────────────────────────────────────────
interface ApiError {
  success: false;
  error: string;
}
```

---

## Respuesta de error estándar

Todos los endpoints de error responden con:
```json
{ "success": false, "error": "Mensaje legible para el usuario" }
```

| Código HTTP | Cuándo ocurre |
|---|---|
| 400 | Validación de negocio (stock insuficiente, estado inválido, campos faltantes) |
| 401 | Token ausente, inválido o sesión cerrada |
| 403 | Sin acceso al almacén o al recurso |
| 404 | Recurso no encontrado |
| 409 | Recurso bloqueado por otro usuario (lock activo) |
| 500 | Error interno del servidor |

---

## Módulo AUTH

### POST `/auth/login`
No requiere token.

**Request:**
```json
{
  "userId": "encargado01",
  "password": "Enc01.2024!",
  "warehouseCode": "01"
}
```

**Response 200:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "userId": "encargado01",
    "name": "Encargado Almacen 01",
    "role": "operator",
    "warehouseCode": "01",
    "warehouseCodes": ["01"]
  }
}
```

**Errores:**
- `401` — credenciales inválidas (usuario no existe o password incorrecto)
- `403` — usuario no tiene acceso al `warehouseCode` solicitado
- `400` — campos faltantes

> **Nota React Native**: el `token` tiene duración de 8 horas. Guardar con `SecureStore`. Si el usuario tiene `warehouseCodes` con múltiples entradas, mostrar selector de almacén en login.

---

### POST `/auth/logout`
Requiere token. Invalida la sesión en BD inmediatamente (el token queda inútil aunque no haya expirado).

**Response 200:**
```json
{ "success": true, "message": "Sesión cerrada." }
```

---

### GET `/auth/me`
Requiere token. Devuelve información del usuario autenticado y su sesión activa.

**Response 200:**
```json
{
  "success": true,
  "user": {
    "userId": "encargado01",
    "name": "Encargado Almacen 01",
    "role": "operator",
    "warehouseCode": "01",
    "warehouseCodes": ["01"],
    "sessionId": "ed68e236-1170-41d6-af75-0f29d8fe4d8b"
  }
}
```

> Útil al arrancar la app para verificar que el token guardado sigue válido.

---

## Módulo ÓRDENES

Las órdenes vienen de SAP (ORDR) via polling automático cada 30s.
Cada encargado solo ve las órdenes de **su almacén** (`warehouseCode` del token).

### Máquina de estados de una orden

```
received ──► reviewing ──► confirmed ──► dispatched
                       ├──► partial   ──► dispatched
                       └──► rejected
```

- **received**: orden recibida de SAP, sin revisar
- **reviewing**: el encargado inició la revisión (lock activo)
- **confirmed**: todos los ítems disponibles, reservas creadas
- **partial**: algunos ítems disponibles, otros necesitan traslado
- **rejected**: orden rechazada
- **dispatched**: despacho completado (módulo de despacho)

### Estados de disponibilidad de ítem

- **pending**: sin revisar aún
- **available**: hay stock suficiente
- **needs_transfer**: stock insuficiente, requiere traslado desde otro almacén
- **unavailable**: sin stock

---

### GET `/orders`
Lista órdenes del almacén del usuario autenticado.

**Query params opcionales:**
```
?status=received,reviewing    // filtrar por estado(s), CSV
```

**Response 200:**
```json
{
  "data": [ /* Order[] */ ],
  "total": 3
}
```

> Para la pantalla de lista de órdenes usar esta llamada. Refrescar periódicamente (pull-to-refresh o polling cada 30s para que aparezcan las nuevas de SAP).

---

### GET `/orders/:id`
Detalle completo de una orden con sus ítems y el lock activo si lo hay.

**Response 200:** `Order` completo (ver tipo arriba).

El campo `lock` indica si alguien más está revisando la orden:
```json
"lock": {
  "lockedBy": "encargado01",
  "lockedAt": "2026-06-23T19:30:00.000Z",
  "expiresAt": "2026-06-23T21:30:00.000Z"
}
```
Si `lock !== null` y `lock.lockedBy !== userId_actual`, mostrar banner informativo (solo lectura).

---

### GET `/orders/:id/availability`
Consulta stock en **tiempo real a SAP** para todos los ítems. Más lento que GET /orders/:id.

**Response 200:**
```json
{
  "orderId": "e705c85e-...",
  "items": [
    {
      "lineNum": 0,
      "itemCode": "ITEM-001",
      "itemDescription": "Producto Alpha",
      "quantity": 3,
      "sapStock": 17,
      "otherReserved": 0,
      "netAvailable": 17,
      "canFulfill": true,
      "currentStatus": "available"
    }
  ]
}
```

> Usar para mostrar un "resumen de disponibilidad" antes de iniciar revisión, o en un botón "actualizar stock".

---

### POST `/orders/:id/review`
Inicia la revisión de la orden. Consulta stock SAP para todos los ítems y guarda el valor como **referencia informativa** (`sapStock`), pero **no asigna disponibilidad automáticamente** — todos los ítems quedan en `pending`.
Adquiere un **lock** sobre la orden (bloquea a otros usuarios por 2 horas).

**Body:** vacío `{}`

**Response 200:** `Order` con `status: "reviewing"`, `sapStock` poblado en cada ítem, y `availability: "pending"` en todos.

**Errores:**
- `400` — la orden no está en estado `received`
- `409` — otro usuario ya tiene el lock (`"La orden está siendo revisada por encargado02"`)

> Después de este endpoint el encargado recorre físicamente el almacén escaneando cada artículo con `POST /orders/:id/items/scan`. El campo `sapStock` en cada ítem sirve como referencia de stock en SAP al momento de iniciar.

---

### POST `/orders/:id/items/scan`
Escanea el código de barras de un artículo físico durante el picking. Consulta el stock actual en SAP, calcula disponibilidad neta descontando reservas de otras órdenes y actualiza el ítem.
Solo el encargado dueño del lock puede escanear.

**Body:**
```json
{ "itemCode": "ITEM-001" }
```
`itemCode` es el código escaneado (código de barras o código SAP directo).

**Response 200:** `Order` completo con el ítem actualizado. El campo `availability` del ítem tomará uno de:
- `"available"` — stock SAP neto ≥ cantidad requerida
- `"needs_transfer"` — hay stock parcial, se requiere traslado
- `"unavailable"` — sin stock neto disponible

**Errores:**
- `400` — `itemCode` faltante
- `400` — el artículo escaneado no pertenece a esta orden
- `400` — la orden no está en estado `reviewing`
- `409` — el lock pertenece a otro usuario

> **Flujo de pantalla**: después de cada escaneo el frontend recibe el `Order` actualizado con `progress`. Cuando `progress.pending === 0` todos los ítems están escaneados y se puede habilitar "Confirmar". Si el artículo no se encuentra físicamente, usar `PATCH /orders/:id/items/:lineNum` para marcarlo manualmente como `"unavailable"`.

---

### PATCH `/orders/:id/items/:lineNum`
Ajuste manual de disponibilidad de un ítem. Solo el encargado que inició la revisión (dueño del lock).

**Path param:** `lineNum` — número de línea del ítem (entero, desde 0)

**Body:**
```json
{
  "availability": "needs_transfer",
  "transferNote": "Traer 5 unidades desde almacén central A02"
}
```

`availability` requerido. `transferNote` opcional (solo relevante para `needs_transfer`).
Valores válidos: `"available"`, `"needs_transfer"`, `"unavailable"`

**Response 200:** `Order` completo actualizado.

**Errores:**
- `400` — `availability` faltante o valor inválido
- `400` — la orden no está en estado `reviewing` o `partial`
- `409` — el lock pertenece a otro usuario

---

### POST `/orders/:id/confirm`
Confirma la orden. Solo posible cuando **todos los ítems** tienen disponibilidad distinta de `pending`.
Crea reservas internas para los ítems `available`.

**Body:** vacío `{}`

**Response 200:** `Order` con status `"confirmed"` o `"partial"`.

- `confirmed` — todos los ítems están `available`
- `partial` — mix de `available` y `needs_transfer`

**Errores:**
- `400` — hay ítems en estado `pending` (sin revisar)
- `400` — ningún ítem disponible (rechazar en su lugar)
- `400` — orden no está en revisión

---

### POST `/orders/:id/reject`
Rechaza la orden. Libera reservas si existían.

**Body:**
```json
{ "notes": "Cliente canceló el pedido" }
```
`notes` es opcional.

**Response 200:** `Order` con `status: "rejected"`.

---

## Módulo DESPACHO

El despacho trabaja con **facturas OINV** (no con órdenes ORDR).
El estado del despacho vive **en memoria del servidor** (se pierde si el servidor reinicia).

### Flujo de un despacho

```
encargado ingresa docNum (OINV)
        ↓
POST /dispatch/start         ← solo el responsable puede iniciar
        ↓
loop: POST /dispatch/scan    ← cualquier usuario del mismo almacén puede escanear
  (escanear ítem → siguiente ítem)
        ↓
POST /dispatch/finish        ← SOLO el responsable (dueño del lock) puede cerrar
        ↓
SAP actualizado (PATCH Invoices)
```

### Estados de un despacho

```
pending ──► in_progress ──► completed
                        └──► cancelled
```

---

### GET `/dispatch/invoices`
Lista las facturas abiertas en SAP (OINV) para el almacén del usuario. Usar para mostrar la lista de facturas disponibles antes de iniciar un despacho.

**Response 200:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "docEntry": 1001,
      "docNum": 12345,
      "customerName": "Cliente Alpha S.R.L.",
      "docDate": "2026-06-27",
      "docDueDate": "2026-06-27",
      "warehouseCode": "01",
      "itemCount": 3
    },
    {
      "docEntry": 1002,
      "docNum": 12346,
      "customerName": "Distribuidora Beta",
      "docDate": "2026-06-27",
      "docDueDate": "2026-06-27",
      "warehouseCode": "01",
      "itemCount": 1
    }
  ]
}
```

> Mostrar esta lista cuando el operario entra a la pestaña de Despacho. Al tocar una factura llamar `POST /dispatch/start` con su `docNum`.

---

### POST `/dispatch/start`
Inicia un despacho. Obtiene el detalle completo de la factura de SAP y adquiere un lock.
Un mismo usuario **no puede tener dos despachos activos** simultáneamente.

**Body:**
```json
{ "docNum": 12345 }
```

**Response 201:**
```json
{
  "success": true,
  "message": "Despacho iniciado.",
  "data": {
    "id": "uuid-del-despacho",
    "userId": "encargado01",
    "warehouseId": "W01",
    "status": "in_progress",
    "progress": 0,
    "nextItem": {
      "itemCode": "ITEM-001",
      "description": "Producto Alpha",
      "quantity": 3,
      "picked": 0,
      "remaining": 3,
      "binLocation": "A-01-01",
      "completed": false
    },
    "invoice": {
      "docEntry": 1001,
      "docNum": 12345,
      "warehouseCode": "01",
      "customerName": "Cliente de Prueba S.R.L.",
      "totalItems": 4,
      "totalPicked": 0,
      "isFullyPicked": false,
      "items": [ /* DispatchItem[] */ ]
    },
    "createdAt": "2026-06-23T20:00:00.000Z",
    "updatedAt": "2026-06-23T20:00:00.000Z"
  }
}
```

**Errores:**
- `400` — `docNum` faltante
- `400` — el usuario ya tiene un despacho activo
- `400` — la factura no existe en SAP o no pertenece al almacén del usuario

> Guardar el `id` del despacho en estado local (AsyncStorage/SecureStore) para recuperarlo si la app se cierra y reabre.

---

### POST `/dispatch/scan`
Escanea un ítem. El ítem **debe coincidir con `nextItem`** (el sistema es secuencial).
**Cualquier usuario del mismo almacén** puede escanear (no solo el responsable).

**Body:**
```json
{
  "dispatchId": "uuid-del-despacho",
  "itemCode": "ITEM-001",
  "qty": 1
}
```
`qty` es opcional, default `1`. `itemCode` puede ser el código del item o el código de barras físico (el servidor lo resuelve contra SAP).

**Response 200:**
```json
{
  "success": true,
  "message": "Ítem escaneado correctamente.",
  "data": {
    "dispatchId": "uuid-del-despacho",
    "scanned": {
      "itemCode": "ITEM-001",
      "description": "Producto Alpha",
      "quantity": 3,
      "picked": 1,
      "remaining": 2,
      "binLocation": "A-01-01",
      "completed": false
    },
    "nextItem": {
      "itemCode": "ITEM-001",
      "description": "Producto Alpha",
      "quantity": 3,
      "picked": 1,
      "remaining": 2,
      "binLocation": "A-01-01",
      "completed": false
    },
    "isComplete": false,
    "progress": 25
  }
}
```

Cuando `isComplete: true`:
- `message`: `"Último ítem escaneado. Listo para finalizar."`
- `nextItem`: `null`
- Mostrar botón "Finalizar despacho" (solo habilitado para el responsable)

**Errores:**
- `400` — `dispatchId` o `itemCode` faltante
- `400` — ítem incorrecto (`"Producto incorrecto. Se espera: ITEM-002"`)
- `400` — cantidad excedida
- `400` — código no existe en SAP
- `403` — el despacho es de otro almacén

---

### POST `/dispatch/finish`
Finaliza el despacho. Solo el **responsable** (quien hizo start) puede llamar este endpoint.
Sincroniza con SAP (PATCH Invoices) y libera el lock.

**Body:**
```json
{ "dispatchId": "uuid-del-despacho" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Despacho completado y sincronizado con SAP.",
  "data": { /* Dispatch con status: "completed" */ }
}
```

**Errores:**
- `400` — faltan ítems por escanear
- `409` — el usuario no es el responsable del despacho
- `500` — error al sincronizar con SAP

---

### POST `/dispatch/cancel`
Cancela el despacho. Solo el responsable puede cancelar.

**Body:**
```json
{ "dispatchId": "uuid-del-despacho" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Despacho cancelado.",
  "data": { /* Dispatch con status: "cancelled" */ }
}
```

---

### GET `/dispatch/active/me`
Despacho activo del usuario autenticado. Útil al abrir la app para retomar un despacho en curso.

**Response 200:** `{ "success": true, "data": Dispatch }`
**Response 404:** `{ "success": false, "message": "No hay despacho activo." }`

---

### GET `/dispatch/:id`
Detalle de un despacho por su UUID.

**Response 200:** `{ "success": true, "data": Dispatch }`

---

## Módulo MÉTRICAS

Todos los endpoints de métricas:
- Requieren token
- **Admin**: puede filtrar por `?warehouseCode=XX` o ver todos
- **Operator/Manager**: siempre filtrado a su propio almacén (o los suyos)
- Parámetros de fecha: `from` y `to` en formato `YYYY-MM-DD`

---

### GET `/metrics/summary`
Tarjetas principales del dashboard.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "orders_pending": 5,
    "orders_confirmed": 2,
    "orders_today": 8,
    "active_users": 3,
    "dispatches_today": 4
  }
}
```

---

### GET `/metrics/orders`
Órdenes agrupadas por estado y almacén.

**Query params:** `?from=2026-06-01&to=2026-06-23&warehouseCode=01`

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "warehouse_code": "01", "status": "confirmed", "total": 12 },
    { "warehouse_code": "01", "status": "received",  "total": 3 },
    { "warehouse_code": "02", "status": "rejected",  "total": 1 }
  ]
}
```

---

### GET `/metrics/orders/review-time`
Tiempo promedio que tarda un encargado en revisar una orden (desde recibida hasta revisada).

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "warehouse_code": "01", "avg_minutes": 12.5, "total_reviewed": 20 }
  ]
}
```

---

### GET `/metrics/dispatches`
Despachos completados por operador en un rango de fechas.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "encargado01",
      "warehouse_code": "01",
      "dispatches_completed": 15,
      "first_dispatch": "2026-06-01T08:00:00.000Z",
      "last_dispatch": "2026-06-23T17:30:00.000Z"
    }
  ]
}
```

---

### GET `/metrics/volume`
Volumen de transacciones por día y tipo de acción.

**Query params:** `?from=2026-06-01&to=2026-06-23&action=dispatch_complete`

Valores de `action`: `login`, `logout`, `order_review`, `order_item_scan`, `order_item_update`, `order_confirmed`, `order_rejected`, `dispatch_start`, `dispatch_item_scan`, `dispatch_complete`, `dispatch_cancel`

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "day": "2026-06-23", "action": "dispatch_complete", "warehouse_code": "01", "total": 5, "errors": 0 },
    { "day": "2026-06-23", "action": "order_confirmed",   "warehouse_code": "01", "total": 3, "errors": 0 }
  ]
}
```

---

### GET `/metrics/operators`
Actividad detallada por operador: cuántas acciones hizo, errores y tiempo promedio.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "encargado01",
      "warehouse_code": "01",
      "action": "dispatch_complete",
      "total": 15,
      "errors": 1,
      "avg_ms": 245000
    }
  ]
}
```

---

### GET `/metrics/sessions`
Sesiones activas en este momento. Admin ve todas; operator solo la propia.

**Response 200:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": "session-uuid",
      "user_id": "encargado01",
      "name": "Encargado Almacen 01",
      "role": "operator",
      "warehouse_code": "01",
      "ip_address": "192.168.1.10",
      "created_at": "2026-06-23T08:00:00.000Z",
      "last_seen_at": "2026-06-23T14:35:00.000Z",
      "expires_at": "2026-06-23T16:00:00.000Z"
    }
  ]
}
```

---

## Flujo completo de pantallas sugerido

### App de Encargado (operator)

```
Splash / SplashScreen
  └─► Login Screen
        └─► Home / Dashboard
              ├─► Órdenes Tab
              │     ├─► Lista de Órdenes (GET /orders)
              │     │     ├─► [Pendientes] Badge con conteo
              │     │     └─► Orden Card → Detalle de Orden (GET /orders/:id)
              │     │               ├─► [received]   Botón "Iniciar revisión"
              │     │               │     └─► POST /orders/:id/review
              │     │               │           └─► Pantalla Picking (escanear ítems físicamente)
              │     │               │                 ├─► Escáner cámara → POST /orders/:id/items/scan
              │     │               │                 │     └─► Muestra availability + sapStock del ítem
              │     │               │                 ├─► ítem no encontrado → PATCH /orders/:id/items/:lineNum {availability:"unavailable"}
              │     │               │                 ├─► Botón "Ver stock actual" → GET /orders/:id/availability
              │     │               │                 ├─► Barra progreso (progress.pending === 0 → habilitar Confirmar)
              │     │               │                 ├─► Botón "Confirmar" → POST /orders/:id/confirm
              │     │               │                 └─► Botón "Rechazar" → POST /orders/:id/reject
              │     │               ├─► [reviewing]  Pantalla Picking (si soy el dueño del lock)
              │     │               │                 o Banner "En revisión por X" (si es otro)
              │     │               └─► [confirmed/partial] Orden lista para despacho
              │
              └─► Despacho Tab
                    ├─► GET /dispatch/active/me (al abrir: retomar si hay uno activo)
                    ├─► Lista de Facturas SAP (GET /dispatch/invoices)
                    │     └─► Factura Card → POST /dispatch/start
                    └─► Pantalla Escáner
                          ├─► Mostrar nextItem (código, descripción, ubicación, qty pendiente)
                          ├─► Escáner de cámara (expo-barcode-scanner) → POST /dispatch/scan
                          ├─► Progreso visual (barra %)
                          ├─► [isComplete] Botón "Finalizar" (solo al responsable)
                          │     └─► POST /dispatch/finish
                          └─► Botón "Cancelar" (solo al responsable)
                                └─► POST /dispatch/cancel
```

### App de Admin/Dashboard

```
Login
  └─► Dashboard (GET /metrics/summary)
        ├─► Tarjetas: pendientes, confirmadas, despachos hoy, usuarios activos
        ├─► Gráfico órdenes por día (GET /metrics/orders?from=...&to=...)
        ├─► Tabla operadores (GET /metrics/operators)
        ├─► Tiempo de revisión (GET /metrics/orders/review-time)
        └─► Sesiones activas (GET /metrics/sessions)
```

---

## Manejo de errores en React Native

```ts
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token');
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const json = await res.json();

  if (res.status === 401) {
    // Sesión expirada o cerrada → limpiar y volver al login
    await SecureStore.deleteItemAsync('auth_token');
    // Navegar a Login screen
    return;
  }

  if (res.status === 409) {
    // Recurso bloqueado → mostrar quién lo tiene y cuándo expira
    throw new LockError(json.error);
  }

  if (!res.ok) {
    throw new Error(json.error || 'Error inesperado');
  }

  return json;
}
```

---

## Comportamientos especiales a implementar

### 1. Lock (409)
Cuando un endpoint retorna 409 mostrar un `Alert` o `Toast` con el mensaje del servidor.
El mensaje incluye el nombre del usuario que tiene el lock.
Ejemplo: `"La orden está siendo revisada por encargado02. Intenta más tarde."`

### 2. Despacho colaborativo
- Pantalla de escáner accesible para cualquier usuario del mismo almacén
- Si el usuario no es el propietario del despacho: ocultar/deshabilitar botón "Finalizar"
- Detectar si es propietario: `dispatch.userId === currentUser.userId`

### 3. Polling de órdenes nuevas
El servidor recibe órdenes de SAP cada 30s. En la lista de órdenes hacer polling cada 30s:
```ts
useEffect(() => {
  const interval = setInterval(fetchOrders, 30_000);
  return () => clearInterval(interval);
}, []);
```

### 4. Escáner de código de barras
El servidor acepta tanto `ItemCode` directo como código de barras físico en ambos módulos.
Usar `expo-barcode-scanner` o `expo-camera` con `BarcodeScanner`.
Enviar el valor escaneado directamente en `itemCode` — el servidor lo resuelve contra SAP.

**En revisión de órdenes** (`POST /orders/:id/items/scan`):
- Escanear marca el ítem como `available`, `needs_transfer` o `unavailable` según stock SAP en tiempo real
- Si el código no pertenece a la orden: error 400 → mostrar alerta de "artículo incorrecto"
- Cuando `progress.pending === 0`: habilitar botón "Confirmar"

**En despacho** (`POST /dispatch/scan`):
- El ítem debe coincidir con `nextItem` (flujo secuencial)
- Si el código es incorrecto: error con el código esperado → vibrar + alerta roja

### 5. Recuperar despacho activo al reabrir la app
```ts
// En App startup
const activeDispatch = await apiCall('/dispatch/active/me');
if (activeDispatch) {
  navigation.navigate('Scanner', { dispatch: activeDispatch });
}
```

### 6. Rol admin con múltiples almacenes
Si `user.warehouseCodes.length > 1` o `role === 'admin'`, mostrar selector de almacén en el dashboard.
El filtro se pasa como `?warehouseCode=XX` en las llamadas a `/metrics/*`.

---

## Usuarios de prueba disponibles

| userId | password | role | almacenes |
|---|---|---|---|
| `admin` | `Admin.2024!` | admin | TODOS |
| `encargado01` | `Enc01.2024!` | operator | 01 |
| `encargado02` | `Enc02.2024!` | operator | 02 |
| `supervisor` | `Sup.2024!` | manager | 01, 02 |
