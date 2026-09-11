# Cambios pusheados a rama `Luis` — 2026-07-01

Cubre los dos commits nuevos respecto a la rama anterior:
- **Frontend** `6b40e4a → 13a28a3` (18 archivos, +1418 / −430 líneas)
- **Backend** `8707a63 → f03061e` (4 archivos, +75 / −10 líneas)

---

## BACKEND — `fix: despacho — faltantes no bloquean cierre, barCode en hydrate`

### `models/dispatch.models.js`

**`Dispatch.complete()` ya no bloquea cuando hay items sin escanear.**

Antes lanzaba un error listando los items con `picked < quantity`. Ahora los items no escaneados se tratan como faltantes implícitos (el estado "faltante" solo existe en la UI del frontend; el backend no tiene ese concepto). El operario puede cerrar el despacho libremente.

```diff
- const pending = this.invoice.items.filter(i => !i.isCompleted());
- if (pending.length > 0) throw new Error(`Faltan ítems: ${list}`);
+ // Items no escaneados son tratados como faltantes (estado solo de UI).
```

---

### `services/dispatch.repository.js`

**`_hydrate` ahora obtiene barcodes de SAP al recuperar un despacho activo.**

`dispatch_items` no almacena `barCode`. Al hidratar un despacho existente (ej. al retomar picking), se llama `sapClient.fetchBarcodes(itemCodes)` para completar ese campo, permitiendo escaneos por código de barras en despachos recuperados.

```diff
+ const barcodeMap = itemCodes.length > 0
+     ? await sapClient.fetchBarcodes(itemCodes).catch(() => ({}))
+     : {};
// ...
  barCode: barcodeMap[i.item_code] ?? null,
```

**Nuevo método `findSummaryByWarehouse(warehouseCode, statuses)`.**

Query SQL ligera (sin hidratar objetos `Dispatch`) que devuelve resumen de despachos filtrando por estado. Usada por `listInvoices` para cruzar facturas SAP con picking activo en BD.

---

### `services/dispatch.service.js`

**`listInvoices(warehouseCode, statusFilter)` — filtrado real por estado.**

Antes siempre consultaba SAP y devolvía todas las facturas abiertas. Ahora:

| `statusFilter` | Fuente de datos |
|---|---|
| `pending` | SAP (facturas abiertas) filtradas a las que NO tienen despacho activo en BD |
| `active` | SAP (facturas abiertas) filtradas a las que SÍ tienen despacho activo en BD |
| `completed` | BD propia (despachos con `status = 'completed'`), no SAP |
| `all` | SAP completo + anotado con `dispatchStatus` y `dispatchId` |

El cruce SAP↔BD agrega `dispatchStatus: 'pending' | 'active'`, `dispatchId` e `itemsPicked` a cada factura de SAP.

---

### `controllers/dispatch.controller.js`

**`GET /dispatch/invoices` acepta `?status=all|pending|active|completed`.**

Valida el parámetro contra la lista permitida (por defecto `'all'`) y lo pasa a `dispatchService.listInvoices`.

---

## FRONTEND — `feat: mejoras Despacho y Pedidos`

### `src/api/axiosClient.js`

Cambio de `BASE_URL`: `ngrok-free.dev` → `trycloudflare.com` (nuevo túnel activo).

---

### `src/api/despachoService.js`

**`fetchInvoices(statusFilter = 'all')`** — ahora acepta filtro y lo pasa como `?status=` al backend.

---

### `src/hooks/useDespacho.js`

**`fetchDocumentos(statusFilter = 'all')`** — parámetro propagado a `despachoService.fetchInvoices`.

**Validación de orden secuencial de escaneo (client-side).**

Si `itemActual` está definido y el código escaneado no corresponde a ese item, se dispara `error_escaneo` en el item correcto y se devuelve `motivo: 'orden_incorrecto'` sin llamar al backend.

```js
if (itemActual && item.itemCode !== itemActual) {
  vibrarErrorEscaneo();
  marcarErrorEscaneoStore(itemActual);
  setTimeout(() => revertirErrorEscaneoStore(itemActual), 1500);
  return { ok: false, motivo: 'orden_incorrecto' };
}
```

---

### `src/store/pedidosStore.js`

**Nuevo action `optimisticUpdateItem(lineNum, changes)`.**

Mismo patrón que `marcarFaltante` en `despachoStore`: muta el store inmediatamente, antes de que responda la red. El hook llama esto primero y luego hace el API call; si el backend responde, `updateOrderActual` sobrescribe con el estado real.

```js
optimisticUpdateItem: (lineNum, changes) =>
  set((state) => ({
    orderActual: {
      ...state.orderActual,
      items: state.orderActual.items.map((item) =>
        item.lineNum === lineNum ? { ...item, ...changes } : item
      ),
    },
  })),
```

---

### `src/hooks/usePedidos.js`

**`actualizarItem`** — llama `optimisticUpdateItem` antes del API call. La UI cambia sin esperar la red.

**`escanearItem`** — busca el item coincidente en el store local (por `itemCode` o `barCode`) y sube `scannedQty` optimistamente antes de llamar al backend. Idéntico al comportamiento de Despacho donde el contador sube al escanear.

---

### `src/components/pedidos/ItemAvailabilityRow.jsx`

Reescritura completa. Cambios principales:

**Estado visual derivado del store, sin `selected` local.**

El estado anterior tenía `const [selected, setSelected] = useState(...)` sincronizado por `useEffect`. Esto causaba un render intermedio donde `selected = null` → botones sin selección → apariencia "en blanco". Ahora:

```js
const availability = item.availability ?? ITEM_AVAILABILITY.PENDING;
// active driven directamente por el prop del store:
const active = availability === opt.value;
```

**Sin estado `saving`.** El `disabled={saving}` durante el API call ponía los botones a 45% de opacidad ("en blanco"). Eliminado: `onSeleccionar` es ahora síncrono y llama a `onUpdate` directamente.

**Prop `sugerido`** — resalta el próximo item pendiente con badge "SIGUIENTE" y borde azul, igual que `ProductoItem` en Despacho.

**Contador `scannedQty / quantity`** visible en la esquina superior derecha de la tarjeta, mismo layout que `ProductoItem`.

**Badge de estado** (`Pendiente / Disponible / Traslado / Sin stock`) driven por `item.availability` del store, con color e ícono correspondiente.

**Botón "Confirmación Visual"** — ya no enruta por `escanearItem` (que consulta SAP y puede devolver `unavailable`). Ahora llama directamente `onUpdate(lineNum, { availability: 'available' })`, que activa la actualización optimista.

**Botón "Asignar código"** — integra `AssignBarcodeModal`. Muestra "Código asignado" con ícono diferente una vez asignado.

**Firma del componente:** `{ item, onUpdate, disabled, sugerido }` — se eliminó `onConfirmarVisual` (ya no es necesario).

**Visual de tarjeta** — idéntica a `ProductoItem` de Despacho: barra de acento lateral de color, `shadow.sm`, bordes de color cuando `sinStock` o `sugerido`.

---

### `src/screens/pedidos/PedidosReviewScreen.jsx`

**`puedeConfirmar` ahora requiere al menos un item disponible** (`hayDisponibles`). Antes era posible confirmar una orden donde todos los items estaban marcados como `unavailable`, lo que generaba el error del backend "ningún item está disponible".

**`FlatList` recibe `extraData={actionLoading}`** para forzar re-render cuando cambia el estado de carga.

**`disabled={actionLoading}`** en las filas (no `actionLoading || scanLoading`). `scanLoading` ya no deshabilita las filas individuales — el escaneo actualiza el contador optimistamente sin bloquear la UI.

**Botón "Escanear artículo"** movido del header al footer (mismo layout que `DespachoDetailScreen`). Cambio visual: fondo sólido `C.primary` en lugar de `C.primaryLight`.

**`primerPendiente`** calculado para pasar `sugerido` al `ItemAvailabilityRow` correcto.

**Estilo header** renombrado de `encabezado/encabezadoTop` a `header/headerRow` para consistencia con Despacho.

---

### `src/screens/despacho/DespachoDetailScreen.jsx`

**Nueva fase `'preview'` antes del picking.**

La pantalla ahora tiene dos fases (`useState('preview')`):

- **`preview`**: muestra info de la factura + lista de artículos + botón "Iniciar / Retomar despacho". Nunca salta automáticamente a picking.
- **`picking`**: flujo de escaneo existente, sin cambios.

**Sin auto-jump al montar.** El `useEffect` anterior llamaba `iniciarDespacho({ docNum })` incondicionalmente al montar. Ahora:
- Si el `dispatchActual` ya corresponde a este `docNum` → no hace nada (items ya en store).
- Si `paramDispatchStatus === 'active'` → llama `iniciarDespacho` silenciosamente para cargar los artículos en el preview, pero **no cambia la fase**.

**`onIniciarDespacho`** — si el dispatch ya está en el store (retomar), simplemente hace `setFase('picking')` sin llamada de red.

**Nuevo componente `ItemPreviewCard`** — tarjeta compacta mostrando `itemCode`, descripción, `binLocation` (con ícono) y cantidad. Se renderiza en `ScrollView` dentro del preview.

**Botón dinámico:** muestra `'Retomar despacho'` si `yaEsEsteDespacho`, `'Iniciar despacho'` si no.

**`DespachoListScreen` ahora pasa parámetros al navegar:** `customerName`, `itemCount`, `dispatchStatus`, `dispatchId` — usados en el preview sin necesidad de llamada de red adicional.

**Progreso en picking** — `revisados` ahora incluye tanto `completado` como `faltante` (ambos son estados terminales). Antes solo contaba `completado`, así que marcar faltantes no movía la barra.

**Barra de progreso en verde** cuando `progressPct === 100`.

---

### `src/screens/despacho/DespachoListScreen.jsx`

**Filtros de estado** (`Todos / Por despachar / En picking / Completado`) implementados con `FilterBar`. Al cambiar de tab se llama `fetchDocumentos(valor)`.

**Búsqueda en tiempo real** por número de factura (`useMemo` sobre `documentos`). El botón "Ir" y el escaneo de cámara requieren match exacto en la lista cargada (no navegan a un docNum arbitrario).

**`RefreshControl`** — pull-to-refresh en la lista.

**`EmptyState` contextual** — mensaje e ícono distintos según el filtro activo y si hay query de búsqueda.

**`irADetalle`** ahora pasa `customerName`, `itemCount`, `dispatchStatus`, `dispatchId` al navegar.

**Error banner inline** en lugar del label "Reintentar" separado.

**`keyExtractor`** usa `dispatchId ?? docEntry ?? docNum` para evitar colisiones cuando se mezclan facturas SAP con despachos de BD.

---

### `src/screens/despacho/DespachoConfirmScreen.jsx`

**Progreso calculado siempre desde el estado local** (no desde `dispatchActual.progress` del backend). El backend solo cuenta items `picked`, no conoce los faltantes (UI-only), así que su `progress` quedaba desactualizado al marcar faltantes.

**Barra de progreso en verde** cuando `progressPct === 100`.

---

### `src/screens/pedidos/PedidosListScreen.jsx`

**Búsqueda por número de orden** — `TextInput` numérico + botón de cámara (`BarcodeScannerView`). Filtra `ordenesFiltradas` en tiempo real con `useMemo`.

**`FilterBar`** reemplaza los `FilterChip` inline. Nuevas opciones: `Todos / Por revisar / En revisión / Confirmado`.

**`EmptyState` contextual** con mensaje diferenciado si hay query activa.

**`irPorDocNum`** — busca match exacto en `orders` cargadas, muestra Toast si no encuentra.

---

### `src/screens/pedidos/PedidosDetailScreen.jsx`

**`docDate` y `docDueDate` defensivos** — usa `'—'` si el campo es `null/undefined` en lugar de pasarle `undefined` a `new Date()` (que genera "Invalid Date").

---

### `src/components/despacho/OrdenCard.jsx`

**`DISPATCH_CFG`** — mapa de estado (`pending / active / completed`) a color, ícono y label.

- Barra de acento lateral en el color del estado.
- Badge en el color del estado (antes siempre verde "Abierta").
- Barra de progreso `itemsPicked / itemCount` visible cuando `dispatchStatus === 'active'`.
- Muestra `completedAt` si el despacho está completado.
- Muestra vencimiento SAP y cantidad de items con íconos.

---

### `src/components/pedidos/OrderCard.jsx`

- `fechaVence` defensivo (`null` si `docDueDate` es `null`).
- Meta row con íconos (`calendar-clock`, `clipboard-check-outline`).
- Contador `revisados/total` (items que no son `pending`) en lugar de `avail/total`.
- Barra de progreso solo cuando `enRevision` (`status === reviewing`).
- CTA "Iniciar revisión" sutil para órdenes `received`.
- `docNum` con `flex: 1` para no solaparse con el badge.

---

### `src/components/despacho/ProductoItem.jsx`

_(cambios menores de layout ya presentes en commit anterior, sin cambios funcionales nuevos en este push)_

---

### `src/components/despacho/BarcodeScannerView.jsx`

**`handleScan` y `handleScanHid` con `useCallback`** para no violar reglas de hooks al moverlos antes del `if (!visible) return null`. La función `handleScanHid` adapta la firma de HID (`string`) a la de CameraView (`{ data }`).

---

### `src/components/shared/AssignBarcodeModal.jsx` _(nuevo)_

Modal para asignar un código de barras a un artículo de pedido que no tiene uno en SAP. Incluye `TextInput` para ingreso manual y `BarcodeScannerView` para escaneo con cámara. Llama `PATCH /orders/items/:itemCode/barcode` y cierra el modal al completar.

---

### `src/components/shared/FilterBar.jsx` _(nuevo)_

Barra de chips horizontal reutilizable. Props: `opciones: {label, value}[]`, `seleccionado`, `onChange`. Usada tanto en `DespachoListScreen` como en `PedidosListScreen`.
