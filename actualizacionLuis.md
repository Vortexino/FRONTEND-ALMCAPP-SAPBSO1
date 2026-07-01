# Actualización Módulo de Despacho — Rama Luis

---

## 1. Faltantes ya no bloquean el cierre del despacho

### Antes
`POST /dispatch/finish` devolvía error `400` si algún ítem no había sido escaneado completamente:
```json
{ "error": "Faltan ítems por recoger: NE-00403 (0/4), NE-00512 (2/4)" }
```
El operario estaba obligado a escanear todos los ítems antes de poder cerrar.

### Ahora
El cierre siempre procede. Los ítems no escaneados quedan con `picked < quantity` — el frontend puede mostrarlos como faltantes en el resumen, pero no bloquean la operación.

**Recomendación para el frontend:** mostrar un resumen de ítems incompletos antes de llamar `POST /dispatch/finish` para que el operario confirme conscientemente que hay faltantes.

---

## 2. `barCode` disponible en todos los endpoints de despacho

Antes `barCode` solo venía en la respuesta de `POST /dispatch/start`. Ahora también está disponible en:

- `GET /dispatch/:id`
- `GET /dispatch/active/me`

Cada ítem de la factura incluye el campo `barCode`:

```json
{
  "items": [
    {
      "itemCode":    "NE-00403",
      "description": "225/65R17 COSMO BW EL JEFE H/T 102H",
      "quantity":    4,
      "picked":      0,
      "barCode":     "810047083696",
      "binLocation": "A-01-02"
    }
  ]
}
```

> Si `barCode` es `null`, el ítem no tiene código de barras en SAP — usar `itemCode` directamente en `POST /dispatch/scan`.

---

## 3. `GET /dispatch/invoices` — nuevo filtro por estado

El endpoint ahora acepta el parámetro opcional `?status=`.

### Antes
Siempre devolvía todas las facturas abiertas en SAP.

### Ahora

```
GET /dispatch/invoices?status=all        (default — mismo comportamiento anterior + campo dispatchStatus)
GET /dispatch/invoices?status=pending    Facturas sin picking iniciado
GET /dispatch/invoices?status=active     Facturas con despacho en curso
GET /dispatch/invoices?status=completed  Despachos ya finalizados (desde BD, no SAP)
```

### Campos nuevos en la respuesta

Todos los modos excepto `completed` devuelven facturas SAP enriquecidas con:

| Campo | Tipo | Descripción |
|---|---|---|
| `dispatchStatus` | `"pending"` \| `"active"` | Si la factura ya tiene picking iniciado o no |
| `dispatchId` | `string` \| `null` | ID del despacho en BD (si existe) |
| `itemsPicked` | `number` | Cantidad de ítems completamente escaneados |

Ejemplo `status=all`:
```json
{
  "success": true,
  "total": 3,
  "data": [
    {
      "docNum":        1016539,
      "customerName":  "DISTRIBUIDORA NORTE SRL",
      "warehouseCode": "01",
      "itemCount":     5,
      "dispatchStatus": "active",
      "dispatchId":    "c3f1a2b4-...",
      "itemsPicked":   3
    },
    {
      "docNum":        1016540,
      "customerName":  "FERRETERIA EL PERNO",
      "warehouseCode": "01",
      "itemCount":     2,
      "dispatchStatus": "pending",
      "dispatchId":    null,
      "itemsPicked":   0
    }
  ]
}
```

### Modo `completed`

Devuelve despachos finalizados desde la BD local (facturas que ya no aparecen como abiertas en SAP):

```json
{
  "success": true,
  "total": 1,
  "data": [
    {
      "docNum":        1016501,
      "customerName":  "CLIENTE ABC",
      "warehouseCode": "01",
      "itemCount":     4,
      "itemsPicked":   4,
      "dispatchStatus": "completed",
      "dispatchId":    "a1b2c3d4-...",
      "completedAt":   "2026-06-30T18:45:00.000Z"
    }
  ]
}
```

---

## Resumen de cambios

| Qué | Antes | Ahora |
|---|---|---|
| Cierre con ítems incompletos | `400` — bloqueado | Permitido; ítems faltantes quedan con `picked < quantity` |
| `barCode` en ítems | Solo en `POST /dispatch/start` | También en `GET /dispatch/:id` y `GET /dispatch/active/me` |
| Listado de facturas | Siempre todas las abiertas en SAP | Filtrable por `?status=all\|pending\|active\|completed` |
| Facturas con picking activo | No se distinguían | Campo `dispatchStatus: "active"` y `dispatchId` en la respuesta |
| Historial de completados | No disponible | `?status=completed` devuelve despachos finalizados desde BD |
