# Módulo de Registro de Usuarios

Solo el rol **admin** puede crear usuarios y consultar almacenes.  
Todos los endpoints requieren `Authorization: Bearer <token>` de un admin.

---

## Flujo recomendado en el frontend

```
1. Admin abre pantalla "Crear Usuario"
2. GET /auth/warehouses  →  cargar selector de almacenes
3. Admin completa el formulario
4. POST /auth/register   →  crear usuario
```

---

## GET /auth/warehouses

Lista todos los almacenes activos directamente desde SAP.  
Úsalo para cargar el selector de almacenes en el formulario de registro.

**Headers**
```
Authorization: Bearer <token_admin>
```

**Respuesta exitosa `200`**
```json
{
  "success": true,
  "total": 20,
  "data": [
    { "code": "01", "name": "Santiago Principal" },
    { "code": "04", "name": "Santo Domingo Distrito Nacional" },
    { "code": "07", "name": "Santo Domingo Este" },
    { "code": "10", "name": "Almacen en Transito" },
    { "code": "11", "name": "Almacen de Importaciones" },
    { "code": "12", "name": "Villa Juana" }
    // ... resto de almacenes
  ]
}
```

**Error `403`** — token no es de admin
```json
{ "success": false, "error": "Solo administradores pueden consultar almacenes." }
```

---

## POST /auth/register

Crea un nuevo usuario en el sistema.

**Headers**
```
Authorization: Bearer <token_admin>
Content-Type: application/json
```

**Body**
```json
{
  "userId":         "encargado04",
  "name":           "Encargado Villa Juana",
  "password":       "Enc04.2024!",
  "role":           "operator",
  "warehouseCodes": ["12"]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `userId` | string | ✅ | Identificador único de login (sin espacios) |
| `name` | string | ✅ | Nombre completo que se muestra en la app |
| `password` | string | ✅ | Contraseña inicial (se guarda hasheada con bcrypt) |
| `role` | string | ✅ | `operator`, `manager` o `admin` |
| `warehouseCodes` | string[] | ✅ operator/manager | Códigos de almacén asignados. Para `admin` puede omitirse o enviar `[]` (acceso total) |

**Respuesta exitosa `201`**
```json
{
  "success": true,
  "message": "Usuario encargado04 creado correctamente.",
  "data": {
    "userId":         "encargado04",
    "name":           "Encargado Villa Juana",
    "role":           "operator",
    "warehouseCodes": ["12"]
  }
}
```

**Errores posibles**

| Status | Error | Causa |
|---|---|---|
| `400` | `userId, name, password y role son requeridos.` | Falta algún campo obligatorio |
| `400` | `Rol inválido. Valores permitidos: admin, manager, operator.` | `role` no es uno de los tres valores válidos |
| `400` | `warehouseCodes es requerido para operator y manager.` | operator o manager sin almacenes asignados |
| `403` | `Solo administradores pueden registrar usuarios.` | Token no es de admin |
| `409` | `El usuario encargado04 ya existe.` | `userId` duplicado |

---

## Roles y permisos

| Rol | Acceso a órdenes/despachos | `warehouseCodes` |
|---|---|---|
| `operator` | Solo su almacén asignado | Requerido (uno o más) |
| `manager` | Sus almacenes asignados + métricas | Requerido (uno o más) |
| `admin` | Todo + registro de usuarios | Enviar `[]` o no incluir el campo |

---

## Notas para el frontend

- **El selector de almacenes** debe llenarse con `GET /auth/warehouses` cada vez que se abre el formulario (no cachear — SAP puede agregar almacenes).
- **`warehouseCodes` es un array** aunque el usuario solo tenga un almacén: `["01"]` no `"01"`.
- **Un mismo usuario puede tener varios almacenes**: útil para supervisores regionales.
- **La contraseña inicial** es definida por el admin. El usuario debería cambiarla en su primer login (lógica a implementar en el frontend si se requiere).
- **`userId` es el campo de login**: es el que el usuario escribe en la pantalla de inicio de sesión. Debe ser claro, sin espacios (ej: `encargado04`, `supervisor_dn`).
