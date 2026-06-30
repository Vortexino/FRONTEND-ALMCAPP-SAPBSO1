# Snippets RN/Expo con personalidad

Estos son puntos de partida, no copy-paste literal. Ajusta colores, tipografía y radios a la paleta real del proyecto. Cada snippet tiene versión `StyleSheet` puro; al final de cada sección hay notas de cómo se traduciría a NativeWind y a librerías de UI.

## Botón primario con feedback táctil

```jsx
import { Pressable, Text, StyleSheet, Animated } from 'react-native';
import { useRef } from 'react';

export function Button({ label, onPress, variant = 'primary' }) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Pressable onPressIn={() => press(0.97)} onPressOut={() => press(1)} onPress={onPress}>
      <Animated.View style={[styles.base, styles[variant], { transform: [{ scale }] }]}>
        <Text style={[styles.label, variant === 'primary' && styles.labelPrimary]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14, // ligeramente mayor que el default de 8-12, se siente más suave
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#2D3FE0', // sustituir por color de marca
    shadowColor: '#2D3FE0',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  secondary: {
    backgroundColor: '#F4F4F7',
  },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1F36' },
  labelPrimary: { color: '#FFFFFF' },
});
```

**NativeWind:** reemplaza `styles` por clases (`className="px-5 py-3.5 rounded-2xl bg-[#2D3FE0] active:opacity-90"`), pero la animación de escala con `Animated`/Reanimated sigue siendo necesaria por separado — Tailwind no reemplaza el feedback táctil.

**Tamagui/Gluestack/RN Paper:** estas librerías ya traen `pressStyle`/`onPressIn` con feedback incorporado (ej. `pressStyle={{ scale: 0.97 }}` en Tamagui) — úsalo en vez de reimplementar, pero sigue ajustando radio, sombra y color para que no quede el default de la librería.

## Card de dato (KPI/balance) con jerarquía tipográfica

```jsx
import { View, Text, StyleSheet } from 'react-native';

export function StatCard({ label, value, trend }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {trend && (
        <Text style={[styles.trend, { color: trend.startsWith('+') ? '#1F9D55' : '#E0473C' }]}>
          {trend}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 6,
    shadowColor: '#1A1F36',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8B8B9A', // gris con tinte, no #6B7280 puro
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#1A1F36',
  },
  trend: {
    fontSize: 13,
    fontWeight: '600',
  },
});
```

## Input con label flotante simple (más cuidado que un TextInput plano)

```jsx
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useState } from 'react';

export function FormField({ label, value, onChangeText, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, focused && styles.wrapperFocused]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5,
    borderColor: '#E8E8ED',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
  },
  wrapperFocused: {
    borderColor: '#2D3FE0',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#9A9AA8',
  },
  input: {
    fontSize: 16,
    color: '#1A1F36',
    padding: 0, // evita el padding default inconsistente entre iOS/Android
  },
});
```

## List item con borde de un solo lado (no Divider centrado)

```jsx
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function ListRow({ icon, title, subtitle, onPress, isLast }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.row,
      !isLast && styles.borderBottom,
      pressed && styles.pressed,
    ]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color="#2D3FE0" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4C4CC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  borderBottom: {
    borderBottomWidth: 0.5, // más sutil que el 1px default
    borderBottomColor: '#E8E8ED',
  },
  pressed: { backgroundColor: '#FAFAFC' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600', color: '#1A1F36' },
  subtitle: { fontSize: 13, color: '#8B8B9A', marginTop: 1 },
});
```

## Empty state con copy específico (no "No data available")

```jsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function EmptyState({ icon = 'document-text-outline', title, subtitle }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color="#C4C4CC" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F4F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#1A1F36', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8B8B9A', textAlign: 'center', lineHeight: 20 },
});

// Uso — copy específico a la situación, no genérico:
// <EmptyState
//   icon="receipt-outline"
//   title="Todavía no hay facturas"
//   subtitle="Cuando generes tu primera factura va a aparecer aquí"
// />
```

## Animación de entrada escalonada en listas (con Reanimated)

```jsx
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlatList } from 'react-native';

function AnimatedRow({ item, index }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
      <ListRow {...item} />
    </Animated.View>
  );
}

// dentro del FlatList:
// renderItem={({ item, index }) => <AnimatedRow item={item} index={index} />}
```

Este detalle de 40ms de delay escalonado por índice es barato de implementar y es una de las señales más claras de "alguien cuidó esto" en listas largas (settings, transacciones, notificaciones).

## Notas por librería de UI

- **NativeWind/Tailwind:** el riesgo principal es quedarte con los valores de espaciado/color por defecto de Tailwind (`p-4`, `gray-500`, `rounded-lg` en todo). Define tu propia escala en `tailwind.config.js` (`theme.extend.colors`, `theme.extend.spacing`) en vez de usar los tokens default sin tocar.
- **Tamagui:** usa tokens (`$space`, `$color`) — la trampa es no personalizar el tema (`createTheme`) y quedarte con el tema default, que se nota tanto como el default de shadcn en web.
- **Gluestack:** similar a NativeWind por debajo (usa NativeWind v4) — mismas reglas aplican sobre el `gluestack-ui.config.ts`.
- **React Native Paper:** sigue Material Design por diseño — si el producto no es explícitamente "Android/Material-first", considera si Paper es la elección correcta antes de luchar contra sus defaults para humanizarlo.
