# Actualización Módulo de Órdenes

---

## 1. Campo nuevo: `barCode` en cada ítem

`GET /orders/:id` ahora devuelve el código de barras físico de cada ítem.

### Respuesta de `GET /orders/:id`

```json
{
  "id": "...",
  "docNum": 5001,
  "cardName": "CLIENTE SRL",
  "status": "reviewing",
  "items": [
    {
      "lineNum":         0,
      "itemCode":        "NE-00403",
      "itemDescription": "225/65R17 COSMO BW EL JEFE H/T 102H",
      "quantity":        4,
      "remainingQty":    4,
      "warehouseCode":   "01",
      "availability":    "pending",
      "scannedQty":      0,
      "barCode":         "810047083696",
      "sapStock":        null,
      "reservedQty":     0,
      "netAvailable":    null
    }
  ]
}
```

> Si `barCode` es `null`, el ítem no tiene código de barras en SAP — el operario debe usar el `itemCode` directamente.

---

## 2. Endpoint de escaneo actualizado

`POST /orders/:id/items/scan`

### Antes
```json
{ "itemCode": "NE-00403" }
```

### Ahora
```json
{ "scannedCode": "810047083696" }
```

El campo cambió de `itemCode` → `scannedCode`. El operario puede enviar **cualquiera de los dos**:
- El código de barras físico del producto (`barCode`)
- El código interno de SAP (`itemCode`)

El backend resuelve automáticamente el código escaneado contra SAP.

---

## 3. Escaneo por unidad (NUEVO)

**Cada escaneo cuenta como 1 unidad.** Si la orden pide 4 unidades del mismo artículo, el operario debe escanear ese artículo **4 veces**.

### Comportamiento del backend por escaneo

| Estado | Qué hace el backend |
|---|---|
| `scannedQty < remainingQty` | Incrementa `scannedQty`, ítem sigue en `pending` |
| `scannedQty === remainingQty` | Consulta stock en SAP, asigna `availability` (`available` / `needs_transfer` / `unavailable`) |
| `scannedQty > remainingQty` | Devuelve `400` — cantidad excedida |

### Respuesta durante escaneo parcial (ítem aún `pending`)

```json
{
  "id": "...",
  "status": "reviewing",
  "items": [
    {
      "itemCode":     "NE-00403",
      "barCode":      "810047083696",
      "quantity":     4,
      "remainingQty": 4,
      "scannedQty":   2,
      "availability": "pending"
    }
  ]
}
```

El frontend puede mostrar `scannedQty / remainingQty` como progreso: **"2 / 4 escaneados"**.

### Respuesta cuando se completa la cantidad

```json
{
  "id": "...",
  "status": "reviewing",
  "items": [
    {
      "itemCode":     "NE-00403",
      "barCode":      "810047083696",
      "quantity":     4,
      "remainingQty": 4,
      "scannedQty":   4,
      "availability": "available",
      "sapStock":     24,
      "reservedQty":  0,
      "netAvailable": 24
    }
  ]
}
```

---

## 4. Errores posibles del endpoint de escaneo

| Status | Error | Causa |
|---|---|---|
| `400` | `El campo "scannedCode" es requerido.` | Body sin el campo |
| `400` | `El código X no corresponde a ningún artículo en SAP.` | Barcode o itemCode no existe en SAP |
| `400` | `El artículo X no pertenece a esta orden.` | El ítem existe en SAP pero no está en esta orden |
| `400` | `La orden no está en revisión.` | La orden debe estar en estado `reviewing` |
| `400` | `Cantidad excedida para X. Requerido: N, ya escaneado: N.` | Se intentó escanear más unidades de las pedidas |

---

## 5. Flujo completo de revisión con escáner

```
POST /orders/:id/review       →  inicia revisión, adquiere lock

  por cada ítem de la orden (repetir tantas veces como remainingQty):
  POST /orders/:id/items/scan { scannedCode: "<barcode o itemCode>" }
    →  incrementa scannedQty
    →  cuando scannedQty === remainingQty: consulta SAP y asigna availability

POST /orders/:id/confirm      →  confirma la orden (todos los ítems revisados)
```

---

## Resumen de cambios

| Qué | Antes | Ahora |
|---|---|---|
| Barcodes en ítems | No venían | `barCode` incluido en `GET /orders/:id` |
| Campo del scan | `itemCode` | `scannedCode` |
| Qué acepta el scan | Solo ItemCode SAP | ItemCode **o** código de barras físico |
| Cantidad de escaneos | 1 escaneo = ítem confirmado | 1 escaneo = 1 unidad; necesita `remainingQty` escaneos |
| Campo de progreso | No existía | `scannedQty` indica cuántas unidades ya se escanearon |
