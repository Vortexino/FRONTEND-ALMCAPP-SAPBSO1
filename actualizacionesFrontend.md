# Actualizaciones de Backend para el Frontend

Cambios realizados después del último push publicado (`17b2347`).  
Commits incluidos: `c646a8d` y `d05cba5`.

---

## 1. BREAKING — `GET /dispatch/active/me` ahora devuelve lista

**Antes:**
```json
{
  "success": true,
  "data": { ...dispatch }
}
```
Devolvía un objeto único. Si no había despacho activo, respondía `404`.

**Ahora:**
```json
{
  "success": true,
  "total": 2,
  "data": [ { ...dispatch }, { ...dispatch } ]
}
```
Siempre responde `200`. Si no hay despachos activos, `data` es un array vacío y `total` es `0`.

**¿Por qué?** Un usuario ahora puede tener múltiples despachos activos en paralelo (por ejemplo, cuando una factura necesita algo extra mientras se atiende otra).

**Qué adaptar en el frontend:**
- Reemplazar `response.data` (objeto) por `response.data` (array).
- Si la pantalla mostraba un solo despacho activo, mostrar ahora una lista o el más reciente (`data[0]`).
- Eliminar el manejo del `404` en este endpoint.

---

## 2. Escaneo colaborativo en órdenes

**Antes:** Solo el usuario que inició la revisión (`reviewed_by`) podía llamar a `POST /orders/:id/items/scan`. Cualquier otro usuario recibía `409`.

**Ahora:** Cualquier usuario del mismo almacén puede escanear ítems de una orden en revisión, sin importar quién tiene el lock.

**El lock sigue en pie para:**
- `POST /orders/:id/confirm` — solo el revisor puede confirmar.
- `POST /orders/:id/reject` — solo el revisor puede rechazar (ver punto 3).
- `PATCH /orders/:id/items/:lineNum` — solo el revisor puede ajustar disponibilidad manualmente.

**Qué adaptar en el frontend:**
- No es necesario verificar si el usuario es el dueño del lock antes de mostrar el botón de escaneo.
- Si se quiere mostrar en la UI quién está revisando la orden, usar el campo `reviewed_by` que devuelve la orden.

---

## 3. Rechazo de orden restringido al dueño del lock

**Antes:** `POST /orders/:id/reject` podía ser llamado por cualquier usuario del almacén.

**Ahora:** Solo el usuario que tiene el lock activo puede rechazar. Si otro lo intenta, recibe:
```json
{
  "success": false,
  "error": "Este recurso está siendo usado por encargado01. Intenta más tarde."
}
```
HTTP `409`.

**Qué adaptar en el frontend:**
- El botón de rechazar debe mostrarse habilitado solo para el dueño del lock (igual que confirmar).
- Manejar el `409` con el mismo mensaje que ya se usaba para confirmar.

---

## 4. Nuevos campos en `GET /metrics/dispatches`

El endpoint `GET /metrics/dispatches` (y la clave `dispatches` en `GET /metrics/all`) ahora incluye dos campos nuevos por operador:

```json
[
  {
    "user_id": "encargado01",
    "warehouse_code": "01",
    "dispatches_completed": 5,
    "first_dispatch": "...",
    "last_dispatch": "...",
    "avg_duration_minutes": 12.4,
    "total_units_dispatched": 87
  }
]
```

| Campo nuevo | Descripción |
|---|---|
| `avg_duration_minutes` | Duración promedio por despacho (desde inicio hasta completado), en minutos con un decimal |
| `total_units_dispatched` | Total de unidades físicas despachadas (suma de `quantity_picked`) |

---

## 5. Nueva clave `dispatchStatus` en `GET /metrics/all`

La respuesta de `GET /metrics/all` ahora incluye una clave adicional `dispatchStatus`:

```json
{
  "summary": { ... },
  "ordersByStatus": [ ... ],
  "reviewTime": [ ... ],
  "dispatches": [ ... ],
  "dispatchStatus": [
    { "status": "cancelled",   "total": 2 },
    { "status": "completed",   "total": 18 },
    { "status": "in_progress", "total": 1 }
  ],
  "volume": [ ... ],
  "operators": [ ... ],
  "sessions": [ ... ]
}
```

Útil para gráficas de dona o tarjetas de estado en el dashboard de métricas.  
Acepta los mismos query params que el resto: `?warehouseCode=01&from=2026-06-01&to=2026-06-30`.

---

## Sin cambios en otros endpoints

Los siguientes endpoints no sufrieron cambios de contrato:

- `POST /dispatch/start`
- `POST /dispatch/scan`
- `POST /dispatch/finish`
- `POST /dispatch/cancel`
- `GET /dispatch/invoices`
- `GET /dispatch/:id`
- `GET /orders`, `GET /orders/:id`
- `POST /orders/:id/review`
- `POST /orders/:id/items/scan` *(solo se relajó el permiso)*
- `POST /orders/:id/confirm`
- `PATCH /orders/:id/items/:lineNum`
- `GET /metrics/summary`, `/orders`, `/orders/review-time`, `/volume`, `/operators`, `/sessions`
