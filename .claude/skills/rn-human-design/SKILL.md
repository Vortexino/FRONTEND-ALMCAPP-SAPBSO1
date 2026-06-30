---
name: rn-human-design
description: Use this skill whenever building, reviewing, or refining UI in a React Native / Expo app — screens, components, forms, dashboards, settings pages, empty states, lists, modals. It fixes the "looks AI-generated" problem (uniform spacing, no hierarchy, generic shadcn-style defaults, robotic copy, no tactile feedback) by applying concrete anti-generic principles, a self-audit checklist, and ready-to-adapt RN/Expo component snippets with real personality. Trigger this for any request like "build a settings screen," "make this card nicer," "design a dashboard," "this looks generic/AI-made, fix it," or any UI work in a RN/Expo product/SaaS app — regardless of whether the project uses NativeWind, a UI library (Tamagui, Gluestack, RN Paper), or plain StyleSheet.
---

# Diseño humano para React Native + Expo

## Por qué existe esta skill

El "look de IA" en apps RN no es un problema de mal gusto — es un problema de **defaults sin decisiones**. Cuando no se piensa explícitamente en jerarquía, ritmo y detalle, el modelo (o el dev con prisa) cae en el patrón más probable: padding de 16 en todo, radios de 8 en todo, un solo tono de gris, `Text` y `View` planos, sin estados de press, sin asimetría intencional. El resultado es funcional pero anónimo.

La corrección no es "se más creativo" en abstracto. Es aplicar un set de **reglas concretas y verificables** en cada pantalla, igual que lo haría un diseñador senior repasando su propio trabajo antes de entregarlo.

## Flujo de trabajo

1. **Antes de escribir código**, decide explícitamente (aunque sea en 3 líneas, no hace falta preguntarle al usuario salvo que sea ambiguo):
   - ¿Cuál es el elemento más importante de esta pantalla? (jerarquía)
   - ¿Qué tono tiene el producto? (serio/financiero, cálido/consumer, técnico/dev-tool, etc.)
   - ¿Qué sistema de estilos usa el proyecto? Revisa `package.json` y un componente existente antes de asumir NativeWind, Tamagui, Gluestack, RN Paper o `StyleSheet` puro. Sigue lo que ya existe en el proyecto.
2. **Construye con los principios de `references/principios.md`** — ahí está el detalle de espaciado, tipografía, color, profundidad, movimiento y copy.
3. **Usa los snippets de `references/snippets.md`** como punto de partida, no como plantilla a copiar literal — adáptalos a los tokens/colores reales del proyecto.
4. **Antes de entregar, corre el checklist de auto-auditoría** (abajo). Si el código falla 2 o más puntos, corrígelo antes de mostrarlo al usuario.

## Checklist de auto-auditoría (correr siempre antes de entregar)

Repasa el código que generaste y responde honestamente:

- [ ] **¿Hay más de un valor de espaciado?** Si todo el padding/margin es 16 o todo es múltiplo plano de una sola escala sin variación intencional entre elementos primarios y secundarios, es sospechoso. Usa una escala (4/8/12/16/24/32/48) y varíala según jerarquía real, no por defecto.
- [ ] **¿La tipografía tiene más de 2 pesos/tamaños con propósito?** Un título, un cuerpo y listo es plano. Revisa que haya al menos un contraste deliberado (ej. un dato grande y numérico vs. su label pequeño y mayúsculas).
- [ ] **¿Usé `#000`/`#fff`/grises puros de Tailwind por defecto (`gray-500`, `slate-400`) sin tinte?** Los grises neutros de librería son la huella más reconocible de "hecho por IA". Da un tinte sutil de la paleta del producto a los grises (ej. gris con base del color de marca).
- [ ] **¿Cada superficie interactiva tiene feedback táctil real?** `TouchableOpacity`/`Pressable` sin `activeOpacity`, sin cambio de escala, sin estado `pressed` visible = se siente muerto al tacto.
- [ ] **¿Respeté las convenciones de plataforma?** iOS y Android no deberían verse idénticos en cosas como: fuente del sistema, curva de easing, posición de back button, safe area. Si no hay razón de marca fuerte para forzar un look idéntico, dejar que cada plataforma respire un poco distinto se siente más humano que una uniformidad forzada.
- [ ] **¿El copy es genérico de placeholder?** "No data available", "Something went wrong", "Item 1" son banderas rojas. Un empty state o error con voz propia (aunque sea breve) cambia todo.
- [ ] **¿Hay al menos un detalle no obligatorio que delate cuidado?** Una sombra sutil con el color del fondo en vez de negro puro, un ícono custom en vez del genérico, un borde de 0.5px en vez de 1px, un estado de carga que no es solo un spinner. No hace falta exagerar — uno o dos detalles bastan.
- [ ] **¿Las esquinas/radios son todos iguales?** Border-radius idéntico en botón, card, input y modal es otro patrón de "default sin pensar". Vale la pena variar deliberadamente (ej. radios más grandes en superficies grandes, más chicos en controles).

Si en este repaso encuentras 2+ puntos sin marcar, vuelve atrás y corrige antes de responder al usuario — no muestres el primer intento si sabes que tiene el "look de IA".

## Cuándo NO aplicar esto agresivamente

Si el usuario pide explícitamente seguir un design system existente (Material, HIG estricto, o el sistema de tokens de su empresa), respeta eso al pie de la letra — la prioridad ahí es consistencia, no personalidad. Esta skill es para cuando hay libertad de diseño y el resultado se siente genérico por defecto, no para romper un sistema ya definido.

## Referencias

- `references/principios.md` — el detalle completo de cada principio (espaciado, tipografía, color, profundidad, movimiento, copy, plataforma) con ejemplos de "antes/después".
- `references/snippets.md` — componentes RN/Expo listos para adaptar: botón, card, input, list item, empty state, modal, tab bar — todos con NativeWind y con `StyleSheet` puro, más notas de cómo se traduciría a Tamagui/Gluestack/RN Paper.
