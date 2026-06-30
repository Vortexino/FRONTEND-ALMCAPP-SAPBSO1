# Principios de diseño humano para RN/Expo

Cada sección tiene la regla, por qué importa, y un ejemplo de "antes" (genérico) vs "después" (con intención).

## 1. Espaciado: jerarquía, no uniformidad

**Regla:** Define una escala (ej. 4, 8, 12, 16, 24, 32, 48) y asigna el espaciado según la *relación* entre elementos, no por costumbre. Elementos que pertenecen al mismo grupo van más cerca entre sí que del siguiente grupo (ley de proximidad).

```
// Genérico — todo el mismo padding, sin agrupación visual
<View style={{ padding: 16 }}>
  <Text style={{ marginBottom: 16 }}>Nombre</Text>
  <Text style={{ marginBottom: 16 }}>Email</Text>
  <Text style={{ marginBottom: 16 }}>Teléfono</Text>
</View>

// Con intención — los labels van pegados a su valor (gap chico),
// cada par va separado del siguiente (gap grande)
<View style={{ padding: 20, gap: 24 }}>
  <View style={{ gap: 4 }}>
    <Text style={styles.label}>NOMBRE</Text>
    <Text style={styles.value}>Ana Martínez</Text>
  </View>
  <View style={{ gap: 4 }}>
    <Text style={styles.label}>EMAIL</Text>
    <Text style={styles.value}>ana@empresa.com</Text>
  </View>
</View>
```

El padding exterior de una pantalla (20-24) casi nunca debería ser igual al gap interior entre elementos relacionados (4-8). Si lo es, revisa.

## 2. Tipografía: al menos un contraste deliberado

**Regla:** No te quedes en "título + body". Busca un punto donde el contraste de tamaño/peso cuente algo (un número grande, un estado, un precio). Usa mayúsculas + letter-spacing para labels secundarios — es un patrón simple que añade carácter inmediatamente.

```
// Genérico
<Text style={{ fontSize: 16, fontWeight: 'bold' }}>Balance</Text>
<Text style={{ fontSize: 16 }}>$1,250.00</Text>

// Con intención: el número es el protagonista
<Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#8B8B93', textTransform: 'uppercase' }}>
  Balance disponible
</Text>
<Text style={{ fontSize: 36, fontWeight: '700', letterSpacing: -0.5 }}>
  $1,250.00
</Text>
```

Nota: `letterSpacing` negativo en tamaños grandes (titulares) y positivo en tamaños chicos (labels en mayúsculas) es un truco tipográfico real que usan apps pulidas — no es decoración vacía, mejora la legibilidad en ambos extremos.

## 3. Color: nunca grises puros de librería

**Regla:** Los grises por defecto de Tailwind/Material (`#6B7280`, `#9CA3AF`, `#71717A`...) son neutros perfectos — y por eso se sienten sin alma. Dale un tinte sutil del color de marca a tu escala de grises.

```js
// Genérico: gris neutro de Tailwind
const gray500 = '#6B7280';

// Con tinte: mismo nivel de luminosidad, pero con base del color de marca
// Si tu primario es un azul (#3B5FE0), tiñe el gris hacia ese hue
const gray500Tinted = '#6E7280'; // apenas perceptible, pero coherente
```

Forma rápida de generarlo: toma tu color primario, bájale saturación a ~5-10% y ajusta luminosidad para el nivel de gris que necesitas. La mayoría de editores de diseño (incluso una paleta en código) lo resuelven con un mezclador HSL.

También: evita usar el mismo azul/morado "IA genérica" (#6366F1, #8B5CF6 tipo Indigo/Violet de Tailwind) como color primario si no hay razón de marca — es el color que el 80% de apps generadas por IA usan por defecto.

## 4. Profundidad: sombras con color, no negro puro

**Regla:** Las sombras con `shadowColor: '#000'` se ven planas y digitales. Usa un color de sombra con un tinte ligero (puede ser el primario oscurecido, o simplemente un gris muy oscuro con tinte cálido/frío según el producto).

```js
// Genérico
shadow: {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
}

// Con intención
shadow: {
  shadowColor: '#1A1F36', // azul muy oscuro en vez de negro
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4, // Android
}
```

En Android recuerda que `elevation` genera su propia sombra del sistema — si necesitas control total del color en Android también, considera una librería de sombra custom o `react-native-shadow-2`.

## 5. Movimiento: feedback táctil real

**Regla:** Todo elemento presionable necesita reaccionar visiblemente al toque. Sin esto, una UI se siente "muerta" sin importar cuán bonita sea estática.

```jsx
// Genérico — sin feedback visible
<TouchableOpacity onPress={onPress}>
  <View style={styles.button}><Text>Continuar</Text></View>
</TouchableOpacity>

// Con feedback real usando Pressable + escala
import { Pressable, Animated } from 'react-native';
import { useRef } from 'react';

function Button({ onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 50 }).start();

  return (
    <Pressable
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
      onPress={onPress}
    >
      <Animated.View style={[styles.button, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
```

Si el proyecto ya usa `react-native-reanimated` (muy común con Expo), prefiere `useAnimatedStyle` + `withSpring` en vez de la API de `Animated` clásica — es más fluido y es lo esperable en un proyecto moderno.

Para listas, considera animar la entrada de los items (`FadeInDown` de Reanimated, con un pequeño `delay` escalonado por índice) — ese detalle de 200ms hace que una lista se sienta viva en vez de aparecer de golpe.

## 6. Plataforma: no todo tiene que verse idéntico en iOS y Android

**Regla:** Forzar pixel-parity entre plataformas es uno de los motivos por los que las apps RN se sienten "de IA" — ninguna de las dos plataformas se siente como en casa. Salvo que haya una razón de marca fuerte, dejar pequeñas diferencias nativas es más humano:

- Fuente del sistema: usar la fuente nativa (San Francisco en iOS, Roboto en Android) en vez de forzar una sola fuente custom en ambas, salvo que el branding la requiera explícitamente.
- Iconografía: `@expo/vector-icons` permite elegir sets distintos por plataforma si se quiere (ej. Ionicons en iOS, MaterialIcons en Android) — no es obligatorio, pero es una opción válida.
- Safe areas: usa siempre `react-native-safe-area-context` (`useSafeAreaInsets`), nunca un padding-top fijo — los notches y barras de gestos varían demasiado para hardcodear.
- Back navigation: en iOS el swipe-back y el header con flecha son la norma; en Android, el botón físico/gesto de atrás del sistema ya lo maneja React Navigation — no dupliques ese affordance innecesariamente.

```js
import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
});
```

## 7. Copy: nunca placeholder genérico

**Regla:** El texto de la UI es diseño. "No data available", "Error", "Item 1", "Lorem ipsum" delatan que nadie pensó en la voz del producto. Sustituye por texto que suene a una persona explicando la situación.

```
// Genérico
"No data available"
"Something went wrong"
"Please try again later"

// Con voz propia (ajustar tono al producto real)
"Todavía no tienes movimientos este mes"
"Algo se rompió de nuestro lado — ya lo estamos viendo"
"Reintenta en unos segundos, suele resolverse solo"
```

No hace falta que sea gracioso o casual si el producto es serio (ej. fintech, salud) — pero sí específico a la situación real, no copy de relleno.

## 8. Asimetría y detalle intencional

**Regla:** No todo necesita estar perfectamente centrado y simétrico. Un pequeño elemento descentrado, un ícono que rompe la grilla, un borde que solo aparece en un lado — eso es lo que distingue "diseñado" de "generado". Úsalo con moderación: 1-2 detalles de este tipo por pantalla, no en cada elemento.

Ejemplos concretos que funcionan bien en apps producto/SaaS:
- Borde de 0.5-1px solo en el lado donde una sección termina (en vez de un `Divider` ancho centrado).
- Un badge o indicador de estado que sobresale levemente fuera del contenedor (`position: 'absolute'`, offset negativo).
- Iconos a tamaño impar (18, 22) en vez de los redondos típicos (16, 20, 24) — apenas perceptible pero rompe el patrón de librería.
