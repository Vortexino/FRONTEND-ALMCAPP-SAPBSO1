# SOLID en componentes React Native / Expo

Cada principio: qué dice originalmente, qué significa en componentes RN, el "code smell" que delata su violación, y un ejemplo antes/después.

## S — Single Responsibility (una razón para cambiar)

**Traducción a RN:** un componente debería tener un solo motivo para cambiar — o renderiza, o gestiona datos/efectos, no ambos en el mismo archivo.

**Code smell:** un componente con `useEffect` haciendo fetch, lógica de validación, y JSX de presentación todo junto. Si tuvieras que tocarlo por un cambio de API Y un cambio visual, son dos responsabilidades.

```jsx
// Antes — mezcla fetch, estado de carga y presentación
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.app.com/users/${userId}`)
      .then(res => res.json())
      .then(data => { setUser(data); setLoading(false); });
  }, [userId]);

  if (loading) return <ActivityIndicator />;
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>
    </View>
  );
}

// Después — el hook gestiona datos, el componente solo presenta
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.app.com/users/${userId}`)
      .then(res => res.json())
      .then(data => { setUser(data); setLoading(false); });
  }, [userId]);

  return { user, loading };
}

function UserProfile({ userId }) {
  const { user, loading } = useUser(userId);
  if (loading) return <ActivityIndicator />;
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>
    </View>
  );
}
```

Ahora `useUser` se puede testear y reusar sin montar UI, y `UserProfile` se puede probar pasándole un usuario mock sin tocar red.

**Cuándo NO forzarlo:** un formulario que valida, gestiona estado y renderiza junto suele ser más legible cohesivo que partido en tres piezas — la cohesión real (todo cambia junto, por el mismo motivo) no es lo mismo que "hace varias cosas". SRP es sobre *razones de cambio*, no sobre contar líneas de useState.

## O — Open/Closed (extensible sin modificar lo existente)

**Traducción a RN:** poder agregar una variante nueva (otro tipo de botón, otro layout de card) sin editar la lógica interna del componente ya existente y probado. La herramienta principal en React para esto es **composición**, no HOCs ni flags booleanos que se acumulan.

**Code smell:** un componente con cada vez más props booleanas (`isPrimary`, `isCompact`, `isDanger`, `hasIcon`...) y un `if`/`switch` interno que crece con cada caso nuevo. Cada feature nueva obliga a tocar el componente compartido.

```jsx
// Antes — cada variante nueva agrega una prop y una rama interna
function Button({ label, onPress, isPrimary, isDanger, isCompact, hasIcon, iconName }) {
  let backgroundColor = isPrimary ? '#2D3FE0' : isDanger ? '#E0473C' : '#F4F4F7';
  let padding = isCompact ? 8 : 14;
  return (
    <Pressable onPress={onPress} style={{ backgroundColor, padding }}>
      {hasIcon && <Ionicons name={iconName} size={16} />}
      <Text>{label}</Text>
    </Pressable>
  );
}

// Después — Button es la base cerrada a modificación, las variantes se componen
function Button({ children, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={[styles.base, style]}>
      {children}
    </Pressable>
  );
}

function DangerButton({ label, onPress }) {
  return (
    <Button onPress={onPress} style={styles.danger}>
      <Text style={styles.dangerLabel}>{label}</Text>
    </Button>
  );
}

function IconButton({ label, icon, onPress }) {
  return (
    <Button onPress={onPress}>
      <Ionicons name={icon} size={16} />
      <Text>{label}</Text>
    </Button>
  );
}
```

Agregar `SuccessButton` mañana no toca `Button` para nada — eso es estar "cerrado a modificación, abierto a extensión".

**Cuándo NO forzarlo:** si solo existen y van a existir 2 variantes conocidas (ej. primario/secundario, sin planes de más), un par de props simples es más KISS que armar una API de composición para un caso que no va a crecer. No diseñes la extensibilidad de algo que no te han pedido extender.

## L — Liskov Substitution (las variantes no deben sorprender)

**Traducción a RN:** si tienes una variante de un componente (`SubmitButton` basado en `Button`, `IconCard` basado en `Card`), debe poder usarse en cualquier lugar donde se use la base sin romper expectativas — mismas props esenciales, mismo comportamiento ante los mismos eventos.

**Code smell:** una variante que ignora una prop que la base sí respeta (ej. `onPress` no hace nada en la variante), o que requiere props adicionales obligatorias que la base no pedía, rompiendo el contrato implícito.

```jsx
// Antes — IconButton "extiende" Button pero rompe el contrato: ignora onLongPress
function Button({ onPress, onLongPress, children }) {
  return <Pressable onPress={onPress} onLongPress={onLongPress}>{children}</Pressable>;
}

function IconButton({ onPress, icon }) {
  // onLongPress desapareció — si algo en la app esperaba que funcionara, se rompe en silencio
  return <Pressable onPress={onPress}><Ionicons name={icon} /></Pressable>;
}

// Después — IconButton mantiene el mismo contrato de eventos que Button
function IconButton({ onPress, onLongPress, icon }) {
  return (
    <Button onPress={onPress} onLongPress={onLongPress}>
      <Ionicons name={icon} />
    </Button>
  );
}
```

En RN esto importa especialmente con componentes de navegación/listas: si un `ListItem` custom no soporta `onLongPress` cuando el `ListItem` base de la librería sí, cualquier feature que dependa de eso (ej. menú contextual) se rompe solo en esa variante, de forma difícil de detectar.

## I — Interface Segregation (props enfocadas, no bloated)

**Traducción a RN: "un componente no debería depender de props que no usa."** Si un componente recibe un objeto gigante de configuración pero solo usa 3 campos, está acoplado a más de lo que necesita.

**Code smell:** un componente que recibe `user` completo (con 15 campos) cuando solo muestra `name` y `avatarUrl` — cualquier cambio en la forma de `user` en cualquier parte del código puede romper este componente sin razón real.

```jsx
// Antes — depende de todo el objeto user
function Avatar({ user }) {
  return <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />;
}
// Llamarlo obliga a tener un `user` completo a mano, incluso si solo hay una URL

// Después — pide exactamente lo que usa
function Avatar({ avatarUrl }) {
  return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
}
// <Avatar avatarUrl={user.avatarUrl} /> o <Avatar avatarUrl={someOtherSource} />
```

Esto también previene un problema muy de RN: si `Avatar` recibe `user` completo, React puede re-renderizarlo cuando *cualquier* campo de `user` cambia (incluso uno irrelevante para el avatar), no solo cuando cambia `avatarUrl`.

**Cuándo NO forzarlo:** componentes internos de una sola pantalla que nunca se van a reusar fuera de ese contexto no necesitan props quirúrgicamente mínimas — el costo de mantenerlas "puras" no se paga si nunca hay un segundo consumidor.

## D — Dependency Inversion (depende de abstracciones, no de implementaciones concretas)

**Traducción a RN:** la UI no debería llamar directamente a un SDK específico (Firebase, Supabase, axios con una URL hardcodeada) — debería depender de una función/hook que abstraiga esa fuente, para poder cambiarla o mockearla sin tocar el componente.

**Code smell:** un componente de pantalla que importa el cliente de Supabase/Firebase directamente y hace queries dentro del JSX-component. Si cambias de backend o necesitas testear sin red, tienes que tocar la pantalla.

```jsx
// Antes — la pantalla depende directamente de Supabase
import { supabase } from '../lib/supabase';

function InvoicesScreen() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    supabase.from('invoices').select('*').then(({ data }) => setInvoices(data));
  }, []);
  return <FlatList data={invoices} renderItem={...} />;
}

// Después — la pantalla depende de un hook, no de Supabase directamente
function useInvoices() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    supabase.from('invoices').select('*').then(({ data }) => setInvoices(data));
  }, []);
  return invoices;
}

function InvoicesScreen() {
  const invoices = useInvoices();
  return <FlatList data={invoices} renderItem={...} />;
}
```

Esto no es "crear una interfaz abstracta de inyección de dependencias" al estilo Java/Spring — en React, "depender de una abstracción" casi siempre significa simplemente **extraer a un hook**. No hace falta más ceremonia que eso para el 90% de los casos en una app RN.

**Cuándo NO forzarlo:** un prototipo de un solo uso, o una pantalla que de verdad nunca va a cambiar de fuente de datos ni se va a testear aisladamente, no necesita esta capa — es la abstracción más fácil de sobre-aplicar sin necesidad real.

## Señales de que un principio aplica de verdad (no solo "porque toca")

Aplica el principio correspondiente cuando notes:

- **Vas a copiar y pegar un componente para cambiarle una cosa chica** → señal de OCP/composición.
- **Un archivo pasa de ~200 líneas y tienes que hacer scroll para recordar qué hace** → señal de SRP.
- **Estás a punto de escribir el cuarto `if (variant === ...)` en el mismo componente** → señal de OCP.
- **Vas a testear un componente y te das cuenta de que necesitas mockear una API externa para hacerlo** → señal de DIP (extrae a hook).
- **Una prop que pediste hace 2 semanas ya no se usa, pero el componente sigue aceptándola "por si acaso"** → bórrala, eso es lo opuesto a ISP, es acumulación.

Si ninguna de estas señales está presente, probablemente el código ya está bien como está — no hace falta refactorizar preventivamente.
