# Informe de Conectividad Frontend → Backend
**Fecha:** 2026-07-01  
**Frontend:** Expo SDK 54 / React Native 0.81.5  
**Base URL configurada:** `https://nonabstractly-interpetiolar-millard.ngrok-free.dev`

---

## Resumen ejecutivo

El túnel ngrok **está activo y respondiendo** (antes daba `ERR_NGROK_3200` —
offline; ahora responde HTTP). Sin embargo, **todos los endpoints devuelven
`404` con body vacío**, tanto sin prefijo como con `/api`. El servidor Express
no está resolviendo ninguna de las rutas que el frontend espera.

---

## Resultado de pruebas por endpoint

### Módulo Despacho (`despachoService.js`)

| Método | Ruta llamada por el frontend | Resultado |
|--------|------------------------------|-----------|
| GET  | `/dispatch/invoices`           | **404 — body vacío** |
| GET  | `/dispatch/invoices?status=all`| **404 — body vacío** |
| GET  | `/dispatch/active/me`          | **404 — body vacío** |
| POST | `/dispatch/start`              | No probado (requiere body válido) |
| POST | `/dispatch/scan`               | No probado (requiere body válido) |
| POST | `/dispatch/finish`             | No probado (requiere body válido) |
| POST | `/dispatch/cancel`             | No probado (requiere body válido) |
| GET  | `/dispatch/:id`                | No probado (requiere ID real) |

### Módulo Pedidos (`pedidosService.js`)

| Método | Ruta llamada por el frontend | Resultado |
|--------|------------------------------|-----------|
| GET  | `/orders`                      | **404 — body vacío** |
| GET  | `/orders/:id/availability`     | No probado |
| POST | `/orders/:id/review`           | No probado |
| POST | `/orders/:id/items/scan`       | No probado |
| PATCH| `/orders/:id/items/:lineNum`   | No probado |
| POST | `/orders/:id/confirm`          | No probado |

### Items compartidos (`itemsService.js`)

| Método | Ruta llamada por el frontend | Resultado |
|--------|------------------------------|-----------|
| GET  | `/items/lookup?code=TEST`      | **404 — body vacío** |
| GET  | `/items/search?q=TEST`         | No probado |
| PATCH| `/items/:itemCode/barcode`     | No probado |

### Prueba con prefijo `/api`

Se repitieron las pruebas con prefijo `/api` (ej. `/api/dispatch/invoices`,
`/api/orders`, `/api/items/lookup`). Resultado idéntico: **404 — body vacío**
en todos los casos.

---

## Diagnóstico técnico

### Lo que sí funciona
- El túnel ngrok `nonabstractly-interpetiolar-millard.ngrok-free.dev` responde
  (no está offline).
- Las peticiones HTTP llegan al servidor (hay respuesta, no timeout).

### Lo que falla
1. **Body vacío en el 404.** Express normalmente devuelve `Cannot GET /ruta`
   en texto plano cuando una ruta no existe. Un 404 con body completamente
   vacío sugiere una de dos cosas:
   - El servidor Express **no está corriendo** en el puerto al que ngrok
     está haciendo forward (normalmente 3000). En ese caso, ngrok devuelve
     su propio 404 vacío.
   - Hay un middleware de catch-all que captura todo y devuelve 404 sin body.

2. **Ninguna ruta responde.** Ni `/dispatch`, ni `/orders`, ni `/items`, ni
   `/auth` — ni con prefijo `/api` ni sin él.

---

## Qué necesitamos verificar en el backend

### 1. ¿Está corriendo el servidor Node?
```bash
# Verificar que el proceso está activo
ps aux | grep node
# o en Windows
Get-Process node
```

### 2. ¿En qué puerto escucha Express y a qué puerto apunta ngrok?
```bash
# El frontend asume que ngrok hace forward al puerto donde corre Express.
# Confirmar que coinciden, ej:
ngrok http 3000   # ← debe ser el mismo puerto que app.listen(3000)
```

### 3. ¿Cuál es el prefijo de las rutas?
El frontend llama las rutas **sin** prefijo `/api`:
```
GET /dispatch/invoices
GET /orders
GET /items/lookup
```
Si el router de Express tiene las rutas bajo `/api`, hay que actualizar
`axiosClient.js` — o quitar el prefijo en el backend.

---

## Contrato de rutas que espera el frontend

```
# Auth
POST   /auth/login

# Despacho
GET    /dispatch/invoices?status=all|pending|active|completed
GET    /dispatch/active/me
GET    /dispatch/:id
POST   /dispatch/start          body: { docNum }
POST   /dispatch/scan           body: { dispatchId, itemCode, qty }
POST   /dispatch/finish         body: { dispatchId }
POST   /dispatch/cancel         body: { dispatchId }

# Pedidos
GET    /orders?status=...
GET    /orders/:id
GET    /orders/:id/availability
POST   /orders/:id/review
POST   /orders/:id/items/scan   body: { scannedCode }
PATCH  /orders/:id/items/:lineNum  body: { availability, transferNote? }
POST   /orders/:id/confirm
POST   /orders/:id/reject       body: { notes? }

# Items (compartido Despacho + Pedidos)
GET    /items/lookup?code=...
GET    /items/search?q=...
PATCH  /items/:itemCode/barcode body: { barcode }
```

---

## Headers enviados por el frontend

```http
Authorization: Bearer <token>   ← solo si hay token en SecureStore
Content-Type: application/json
```

El header `ngrok-skip-browser-warning: 1` **no** es enviado por la app —
solo se usó en las pruebas desde esta máquina. Si el backend tiene el
middleware de ngrok que fuerza la pantalla de advertencia, las peticiones
de la app pueden estar siendo bloqueadas también.

---

## Acción inmediata recomendada

1. Confirmar que `node server.js` (o el comando equivalente) está corriendo.
2. Confirmar el puerto exacto y que ngrok apunta a ese puerto.
3. Compartir un ejemplo de respuesta de cualquier ruta que sí funcione
   (ej. desde Postman en localhost) para validar el prefijo correcto.
