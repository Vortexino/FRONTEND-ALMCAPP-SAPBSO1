# AGENTS.md — Despacho (Almacén SAP B1, Genere Import)

> Contexto completo y extendido en `CONTEXT_1.md`. Este archivo es el resumen operativo
> para cualquier agente que trabaje en este repo: léelo antes de tocar código.

## Expo HA CAMBIADO

Lee la documentación versionada exacta en https://docs.expo.dev/versions/v54.0.0/
antes de escribir código. No asumas APIs de otras versiones de SDK.

## Qué es esto

App móvil de almacén para Genere Import, integrada con SAP Business One vía un
backend propio (Node.js) que ya resuelve la capa de SAP Service Layer. Este repo
contiene el **módulo de Despacho** (picking guiado + escaneo de verificación +
cierre/trazabilidad). Un módulo de Pedidos (de un compañero) se integra en paralelo
en el mismo `AppNavigator`.

El frontend de Despacho **nunca habla directo con SAP**. Solo consume el backend
propio:

```
despachoService.js → backend propio (dispatch.routes.js) → SAP Service Layer
```

## Stack actual (instalado, no improvisar otras libs)

| Categoría | Librería | Versión actual |
|---|---|---|
| Runtime | Expo SDK | 54.0.0 |
| Runtime | React Native | 0.81.5 |
| Lenguaje | React | 19.1.0 |
| Navegación | @react-navigation/native + native-stack | v7 |
| HTTP | axios (vía `axiosClient.js`) | ^1.18 |
| Estado global | zustand | ^5 |
| Cámara/escaneo | expo-camera (`CameraView`, `useCameraPermissions`) | ~17.0.10 |
| Feedback háptico | expo-haptics | ~15.0.8 |
| UI | react-native-paper | ^5.15 |
| Íconos | **@expo/vector-icons** (no `react-native-vector-icons`: ese requiere linking nativo incompatible con Expo Go) | ^15.1 |
| Toasts | react-native-toast-message | ^2.3 |
| Persistencia local | @react-native-async-storage/async-storage | 2.2.0 |

Ver versiones exactas siempre en `package.json` (fuente de verdad, no este doc).

## Cómo correr el proyecto

```
npm install
npx expo start            # si el teléfono está en la misma LAN que esta máquina
npx expo start --tunnel   # si NO está en la misma red (requiere @expo/ngrok, ya en devDependencies)
```

Probar con la app **Expo Go** (no build nativo, no dev client). Cualquier librería
nueva que se proponga agregar debe ser compatible con Expo Go o se descarta.

### `--tunnel` está roto (no es bug del proyecto, es incompatibilidad de ngrok)

`npx expo start --tunnel` actualmente **no funciona** en esta máquina y no es algo
arreglable editando código del repo. Causa raíz, confirmada:

- `@expo/ngrok` (devDependency) trae embebido un binario ngrok **v2**
  (`@expo/ngrok-bin@2.3.42`, no existe versión v3 publicada). ngrok deprecó el
  protocolo de agente v2 en su nube — el binario v2 se cae con `failed to start
  tunnel / remote gone away`.
- Sustituir el binario por un ngrok v3 real (instalado en el sistema) tampoco
  sirve: `@expo/ngrok` controla el túnel llamando a la API local del agente
  (`POST /api/tunnels`) para crear túneles dinámicamente — esa API **fue
  eliminada en ngrok v3** (`invalid tunnel configuration`, campos
  `authtoken`/`configPath`/`port` no reconocidos por el schema v3).
- Conclusión: `@expo/ngrok` es incompatible con el ngrok actual sin importar
  qué binario se use. No hay fix de código posible; haría falta que Expo
  publique una versión que use otro mecanismo de túnel.

Workaround manual probado (`ngrok http 8081` con el ngrok v3 del sistema)
también falla en esta cuenta: el plan free de ngrok solo permite **un dominio
estático simultáneo**, y ya está ocupado por el túnel persistente del
**backend** (`nonabstractly-interpetiolar-millard.ngrok-free.dev`). No se puede
correr un túnel de frontend en paralelo con la cuenta actual.

Nota de entorno: el `ngrok.exe` del sistema está instalado vía Microsoft Store
(MSIX) — al ejecutarlo por el alias del PATH, la virtualización de archivos de
MSIX lo hace leer una copia *sandboxeada* de `ngrok.yml` (con un authtoken
distinto/inválido), no el archivo real en
`%LOCALAPPDATA%\ngrok\ngrok.yml`. Para inspeccionar o usar el ngrok real hay que
copiar el binario fuera de `WindowsApps` y ejecutarlo desde ahí.

**Alternativas mientras no se resuelva:** mismo WiFi que la máquina de
desarrollo (`npx expo start` sin `--tunnel`), o una cuenta/dominio ngrok
separado exclusivo para frontend.

Para subir/bajar de versión de SDK: editar `expo` en `package.json`, borrar
`node_modules` + `package-lock.json`, `npm install`, luego `npx expo install --fix`
para realinear el resto de paquetes nativos. Verificar con `npx expo-doctor`.

## Arquitectura de capas (estricta, todo el proyecto)

```
screens/     → solo presentación y navegación. Cero llamadas directas a axios.
hooks/       → orquestan API + store. Único puente entre datos y UI.
store/       → estado reactivo global (Zustand). Solo hooks escriben; screens solo leen.
api/         → llamadas HTTP puras. Sin lógica de negocio ni estado.
components/  → reutilizables, sin estado propio salvo UI local.
```

## Archivos del módulo Despacho (responsabilidad propia)

```
src/api/despachoService.js              # 4 endpoints del backend propio
src/store/despachoStore.js              # documentos[], dispatchActual, itemActual, estadoUI
src/hooks/useDespacho.js                # fetchDocumentos, iniciarDespacho, escanearArticulo,
                                         # marcarFaltante, confirmarDespacho
src/screens/despacho/
  ├── DespachoListScreen.jsx
  ├── DespachoDetailScreen.jsx
  └── DespachoConfirmScreen.jsx
src/components/despacho/
  ├── OrdenCard.jsx
  ├── ProductoItem.jsx
  ├── EstadoBadge.jsx
  └── BarcodeScannerView.jsx            # cámara reutilizable (lista y picking)
```

## Archivos compartidos — actualmente STUBS, no asumir que son definitivos

| Archivo | Dueño real | Estado |
|---|---|---|
| `src/api/axiosClient.js` | Módulo Login (interceptor de token depende de `authStore`) | Stub: baseURL `http://localhost:3000/api`, sin interceptor |
| `src/navigation/AppNavigator.jsx` | Compartido con Pedidos | Stub: solo registra el stack de Despacho |
| `src/constants/routes.js` | Acordado con el equipo | Solo tiene las 3 rutas de Despacho |

No hay `authStore.js` ni `LoginScreen.jsx` en este repo (no son responsabilidad de este
módulo). El `usuarioEscaneo` vive como constante placeholder dentro de
`despachoStore.js` con un TODO — reemplazar por el userId real cuando el módulo Login
se integre.

## Contrato con el backend (sección 8 de `CONTEXT_1.md`)

Endpoints confirmados y ya implementados en `despachoService.js`:

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/dispatch/start` | Al entrar a `DespachoDetailScreen` |
| POST | `/dispatch/scan` | Cada escaneo válido contra un item pendiente |
| POST | `/dispatch/finish` | Botón "Finalizar Despacho" (envía los 3 campos de trazabilidad: `escaneado`, `fechaHoraEscaneo`, `usuarioEscaneo`) |
| GET | `/dispatch/:id` | Refrescar/recuperar estado de una sesión |

**Pendiente de confirmar con el backend:** no existe un endpoint de listado
documentado (sección 8.1). `despachoService.fetchOpenDocuments()` usa un placeholder
(`GET /dispatch?search=`) marcado con TODO — no tratarlo como definitivo sin coordinar.

El contrato de backend **no tiene un campo estructurado de "faltante"** — ese estado
vive solo en `despachoStore` local, no se persiste así en SAP (solo los 3 campos de
trazabilidad al cerrar).

## Estados de un artículo (modelo de UI obligatorio)

| Estado | Trigger | UI |
|---|---|---|
| `pendiente` | sin escanear | esperando acción |
| `completado` | escaneo coincide y cantidad cubierta | verde + vibración corta, avanza al siguiente |
| `faltante` | acción explícita del operario, NUNCA bloquea el resto | badge ámbar |
| `error_escaneo` | código no corresponde a ningún item del documento | rojo + doble vibración, transitorio (se revierte solo) |

`escanearArticulo()` en `useDespacho.js` valida localmente contra los items ya
traídos por `/dispatch/start` (eso es solo lookup en datos ya entregados por SAP via
backend, no es "lógica de SAP duplicada"). Solo pega al backend cuando el código
corresponde a un item pendiente real.

## Explícitamente fuera de alcance (no construir sin coordinar)

- Cantidad parcial estructurada de faltantes por línea (`cantidadEncontrada`) — hay un
  TODO marcado en `despachoStore.js`, campo reservado para Módulo 2.
- Campo `observacionFaltantes` en SAP.
- Firma/foto/QR como evidencia de cierre.
- Modo offline con sincronización diferida.
- Dashboard/reporte acumulado de discrepancias (Módulo 3).

## Reglas de convivencia con el módulo de Pedidos

No modificar archivos de Pedidos ni de Login sin coordinar explícitamente. Pedidos y
Despacho consultan SAP por separado — no asumir payload compartido entre ambos.
