# Actualización Módulo de Despacho

---

## Campo nuevo: `barCode` en cada ítem

`POST /dispatch/start` ahora devuelve el código de barras físico de cada ítem directamente en la respuesta. Ya no es necesario consultarlo por separado.

### Respuesta de `POST /dispatch/start`

```json
{
  "success": true,
  "message": "Despacho iniciado.",
  "data": {
    "id": "c61e5638-6b02-4e6b-a413-cd1b631bfe87",
    "userId": "encargado01",
    "warehouseCode": "01",
    "status": "in_progress",
    "progress": 0,
    "invoice": {
      "docNum": 1016539,
      "customerName": "DREY GOMA SRL",
      "warehouseCode": "01",
      "totalItems": 12,
      "totalPicked": 0,
      "isFullyPicked": false,
      "items": [
        {
          "itemCode":    "NE-00403",
          "description": "225/65R17 COSMO BW EL JEFE H/T 102H",
          "quantity":    12,
          "picked":      0,
          "remaining":   12,
          "barCode":     "810047083696",
          "binLocation": null,
          "completed":   false
        }
      ]
    },
    "nextItem": {
      "itemCode":    "NE-00403",
      "description": "225/65R17 COSMO BW EL JEFE H/T 102H",
      "quantity":    12,
      "picked":      0,
      "remaining":   12,
      "barCode":     "810047083696",
      "binLocation": null,
      "completed":   false
    }
  }
}
```

---

## Cómo usar `barCode` en el frontend

| Campo | Uso sugerido |
|---|---|
| `barCode` | Mostrar debajo del `itemCode` como referencia visual. Si es `null`, mostrar solo el `itemCode`. |
| `itemCode` | Identificador principal del ítem en SAP. |

El operario puede escanear con la pistola **cualquiera de los dos**:
- El código de barras físico del producto (`barCode`)
- El código interno de SAP (`itemCode`)

El backend resuelve ambos automáticamente en `POST /dispatch/scan`.

---

## Flujo de escaneo

```
dispatch/start  →  recibe items con barCode incluido
                   frontend muestra el nextItem con su barCode

operario escanea barCode o itemCode con la pistola
                   ↓
POST /dispatch/scan { dispatchId, itemCode: "<lo que escaneó>" }
                   ↓
backend resuelve el código → valida orden → actualiza picked
                   ↓
respuesta con nextItem y progress %
```

---

## Nota sobre ítems sin barcode

Si `barCode` llega como `null`, el ítem no tiene código de barras registrado en SAP. En ese caso el operario debe escribir o escanear el `itemCode` directamente.

Sugerencia de UI: mostrar un aviso visual cuando `barCode === null` para que el operario sepa que debe usar el código manual.
