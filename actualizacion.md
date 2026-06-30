# Actualizaciones de API — Lo que el frontend debe saber

---

## 1. Login simplificado

`POST /auth/login` ya **no requiere** `warehouseCode`. Solo se envían credenciales.

```json
{ "userId": "encargado01", "password": "Enc01.2024!" }
```

### Respuesta según tipo de usuario

**Usuario con 1 almacén** — token listo directamente:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "userId": "encargado01",
    "role": "operator",
    "warehouseCode": "01",
    "warehouseCodes": ["01"]
  }
}
```

**Admin o usuario con múltiples almacenes** — token listo, `warehouseCode` en null (admin) o primer almacén del array:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "userId": "admin",
    "role": "admin",
    "warehouseCode": null,
    "warehouseCodes": []
  }
}
```

> El frontend debe revisar `warehouseCode`. Si es `null` o el usuario tiene más de un almacén en `warehouseCodes`, mostrar el selector de almacén dentro de la app y llamar a `switch-warehouse`.

---

## 2. Cambio de almacén activo (sin re-login)

`POST /auth/switch-warehouse` — disponible para **admin** y usuarios con **múltiples almacenes asignados**.

**Headers**
```
Authorization: Bearer <token_actual>
Content-Type: application/json
```

**Body**
```json
{ "warehouseCode": "04" }
```

**Respuesta `200`** — devuelve un **token nuevo** con el almacén seleccionado:
```json
{
  "success": true,
  "token": "<jwt_nuevo>",
  "user": {
    "userId": "admin",
    "role": "admin",
    "warehouseCode": "04",
    "warehouseCodes": []
  }
}
```

El frontend debe **reemplazar el token guardado** con el nuevo. A partir de ese momento todas las llamadas a órdenes/despacho/métricas quedarán filtradas por el almacén `04`.

**Errores posibles**

| Status | Error | Causa |
|---|---|---|
| `400` | `warehouseCode es requerido.` | Body vacío o sin el campo |
| `403` | `No tienes acceso al almacén XX.` | El código no pertenece al usuario (solo aplica a operator/manager) |

> Admin puede hacer switch a cualquier almacén. Manager/operator solo a los que tienen asignados en `warehouseCodes`.

---

## 3. Lista de almacenes disponibles (para el selector)

`GET /auth/warehouses` — **solo admin**. Retorna todos los almacenes activos desde SAP en tiempo real.

Úsalo para cargar el picker de almacenes del admin. Para manager/operator usa directamente `warehouseCodes` del token (ya viene de la BD).

```json
{
  "success": true,
  "total": 20,
  "data": [
    { "code": "01", "name": "Santiago Principal" },
    { "code": "04", "name": "Santo Domingo Distrito Nacional" },
    { "code": "07", "name": "Santo Domingo Este" }
  ]
}
```

---

## Resumen del flujo de autenticación completo

```
POST /auth/login  { userId, password }
  │
  ├─ warehouseCode != null → token listo, usar directo
  │
  └─ warehouseCode == null o múltiples almacenes
       │
       ├─ admin → GET /auth/warehouses  para cargar lista
       │
       └─ manager/operator → usar warehouseCodes[] del token
       │
       └─ usuario selecciona almacén →
            POST /auth/switch-warehouse { warehouseCode }
              → token nuevo con almacén activo
```
