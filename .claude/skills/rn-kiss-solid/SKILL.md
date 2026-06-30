---
name: rn-kiss-solid
description: Use this skill whenever writing, reviewing, or refactoring React Native / Expo components and screens for code quality — applying KISS and SOLID adapted specifically to React's component model (not classic OOP). Trigger this for requests like "refactor this component," "this screen is getting too big/messy," "is this component well structured," "split this into smaller pieces," "review this code for best practices," or any code review/cleanup task on .tsx/.jsx files in a RN/Expo project. Also trigger proactively when writing new components of non-trivial complexity (forms, screens with multiple states, list items with several variants), to structure them well from the start instead of fixing it later. Complements the rn-human-design skill (visual/UX) — this skill is about code structure, not visual polish.
---

# KISS + SOLID para componentes React Native / Expo

## Por qué existe esta skill

SOLID nació para POO con clases — aplicado tal cual a React produce abstracciones de sobra: interfaces que nadie usa, HOCs envolviendo HOCs, "servicios inyectados" para un fetch que se hace una vez. Eso no es código limpio, es complejidad disfrazada de buena práctica.

El balance correcto es **SOLID con KISS como límite**: cada principio SOLID se aplica solo hasta el punto donde sigue siendo más simple que la alternativa. Si aplicar un principio te hace escribir más código del que resuelve, eso es la señal de que te pasaste — vuelve a lo simple.

## Flujo de trabajo

**Si estás escribiendo código nuevo:**
1. Empieza lo más simple posible (KISS primero, literalmente). No diseñes para una flexibilidad que no te han pedido.
2. Mientras escribes, vigila las señales de alerta de `references/solid-rn.md` (sección "señales de que un principio aplica de verdad"). Si aparecen, refactoriza ahí mismo.
3. Antes de entregar, corre el checklist de abajo.

**Si estás revisando/refactorizando código existente:**
1. Lee el componente completo primero — no refactorices a ciegas función por función.
2. Identifica qué principio(s) está violando usando `references/solid-rn.md` como referencia de diagnóstico (cada principio tiene su "olor a código" característico).
3. Aplica el refactor mínimo que resuelve el problema real — no reescribas todo lo que toques.
4. Corre el checklist antes de mostrar el resultado.

## Checklist de auto-auditoría (correr siempre antes de entregar)

- [ ] **¿El componente cabe en una pantalla de editor sin scroll mental?** Si un componente pasa de ~150-200 líneas (sin contar estilos), probablemente mezcla responsabilidades. Excepción razonable: formularios y tablas complejas, donde partirlos a la fuerza puede empeorar la legibilidad — usa criterio, no la regla a ciegas.
- [ ] **¿Separé UI de lógica de datos/efectos?** Si un componente tiene `useEffect` haciendo fetch Y JSX de presentación en el mismo archivo, extrae la lógica a un hook (`useUserData`, `useFormValidation`, etc.).
- [ ] **¿Agregué una prop para "una sola vez" que ya no se necesita, o un prop booleano que bifurca todo el render (`isCompact ? <A/> : <B/>` repetido en varios puntos)?** Eso es una señal de que conviene composición (children/slots) en vez de una prop que controla demasiado.
- [ ] **¿Hay alguna abstracción que solo tiene un uso real?** Una interfaz, un wrapper, un "factory" con un solo caso de uso es complejidad sin beneficio — bórralo y vuelve a la versión directa.
- [ ] **¿Las props del componente son todas relevantes para cualquier consumidor, o hay grupos que solo aplican a un caso?** Props que solo tienen sentido en una de tres pantallas que usan el componente es señal de ISP violado — separa en variantes o componilos distinto.
- [ ] **¿El componente llama directamente a `fetch`/`axios`/SDK de Firebase/Supabase dentro del JSX-component, en vez de a través de un hook o servicio?** Acoplar UI a la fuente de datos concreta dificulta testear y reusar — pero si es un prototipo de un solo uso, esto es aceptable, no lo fuerces.
- [ ] **¿Si tuviera que agregar una variante nueva (otro tipo de botón, otro estado de card), tendría que editar el componente existente, o solo agregar algo nuevo al lado?** Si la respuesta es "editar el existente y tocar su lógica interna", revisa si conviene una API de composición en vez de un `if/switch` que crece con cada caso.
- [ ] **¿Apliqué algún principio "porque toca" sin que resuelva un problema real de este código?** Si la respuesta es sí, deshaz esa parte. KISS gana cuando SOLID no aporta nada concreto todavía.

Si 2+ puntos fallan, refactoriza antes de entregar — pero si refactorizar todo el archivo no es lo que se pidió, prioriza el problema señalado y deja una nota breve de qué más convendría revisar.

## Cuándo NO aplicar esto agresivamente

- **Prototipos y código exploratorio** ("hazme algo rápido para probar la idea"): prioriza velocidad, no estructura. No le metas hooks separados ni abstracciones a un mockup de un día.
- **Forms y tablas complejas**: dividir agresivamente por SRP puede hacerlos más difíciles de seguir, no menos. Es un caso reconocido donde un componente "grande pero cohesivo" es preferible a fragmentarlo de más.
- **Si el usuario pide explícitamente un patrón distinto** (ej. ya usan un state manager específico, una arquitectura de carpetas establecida): respeta lo existente, no impongas la estructura "ideal" sobre convenciones ya decididas del equipo.

## Referencias

- `references/solid-rn.md` — cada letra de SOLID traducida a React/RN con ejemplo concreto antes/después, más las señales de alerta ("code smells") que indican cuándo aplica de verdad.
- `references/kiss-rn.md` — KISS como límite práctico: cuándo una abstracción "buena" es en realidad sobre-ingeniería, con ejemplos de RN/Expo (navegación, hooks, manejo de formularios).
