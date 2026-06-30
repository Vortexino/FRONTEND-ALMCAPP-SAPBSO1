# Bugs para el Backend

---

## BUG-01 — `POST /orders/:id/review` devuelve "undefined" en el mensaje 409

**Endpoint:** `POST /orders/:id/review`

**Reproducción:**
1. Abrir una orden con estado `reviewing` (otra sesión tiene el lock).
2. Presionar "Retomar revisión" → se llama `POST /orders/:id/review`.

**Respuesta actual del backend:**
```json
{
  "success": false,
  "error": "La orden está siendo revisada por undefined. Intenta más tarde."
}
```

**Problema:** El backend está incluyendo `undefined` como nombre del usuario que tiene el lock. El campo del revisor no se está resolviendo correctamente antes de armar el mensaje.

**Respuesta esperada:**
```json
{
  "success": false,
  "error": "La orden está siendo revisada por encargado01. Intenta más tarde."
}
```

**Orden afectada en pruebas:** #I012288

---

## BUG-02 — Nombre de campo del lock en `GET /orders/:id`

**Endpoint:** `GET /orders/:id`

**Problema:** El frontend asumió que el objeto `lock` dentro de la orden usa el campo `lockedBy` para identificar al dueño del lock:

```json
{
  "lock": {
    "lockedBy": "encargado01"
  }
}
```

Sin embargo, el mensaje del BUG-01 (`"revisada por undefined"`) indica que ese campo no existe o tiene otro nombre (`userId`, `user_id`, `user`, `reviewed_by`, etc.).

**Solicitud:** Confirmar cuál es el nombre exacto del campo que identifica al usuario dueño del lock dentro del objeto `lock` que devuelve `GET /orders/:id`. Ejemplo de respuesta esperada con el campo correcto:

```json
{
  "id": "...",
  "status": "reviewing",
  "reviewed_by": "encargado01",
  "lock": {
    "userId": "encargado01",   ← ¿es este?
    "expiresAt": "..."
  }
}
```

---

## Contexto

Estos dos bugs están relacionados. El BUG-01 es visible al usuario final (mensaje con "undefined"). El BUG-02 es necesario para que el frontend pueda detectar correctamente quién tiene el lock y bloquear la UI para usuarios sin permiso de confirmar/rechazar.
