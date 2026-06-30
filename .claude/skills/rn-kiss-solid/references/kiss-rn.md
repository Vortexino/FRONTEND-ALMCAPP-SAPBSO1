# KISS como límite práctico en RN/Expo

KISS ("Keep It Simple, Stupid") no es un principio que se "aplica" como SOLID — es el límite que evita que SOLID se vuelva sobre-ingeniería. La pregunta de KISS siempre es la misma: **¿esta abstracción resuelve un problema que tengo ahora, o uno que imagino que podría tener?**

## La prueba rápida antes de abstraer

Antes de extraer un hook, crear una interfaz, o armar un sistema de composición, pregúntate:

1. ¿Este caso de uso ya existe dos veces en el código, o estoy adelantándome a una "tercera vez" que no ha llegado?
2. ¿La versión simple (duplicar un poco de código) es realmente más cara de mantener que la abstracción?
3. ¿Voy a poder explicar esta abstracción a alguien del equipo en una frase, o necesito un diagrama?

Si la respuesta a la 1 es "me estoy adelantando" y a la 3 es "necesito explicar mucho", es sobre-ingeniería — vuelve a lo simple.

## Ejemplos concretos de RN/Expo

### Navegación: no abstraigas `useNavigation` antes de necesitarlo

```jsx
// Sobre-ingeniería — un wrapper de navegación "por si cambiamos de librería"
function useAppNavigation() {
  const navigation = useNavigation();
  return {
    goToScreen: (name, params) => navigation.navigate(name, params),
    goBack: () => navigation.goBack(),
    // ...10 métodos más que solo llaman a navigation.X directamente
  };
}

// KISS — usa el hook de la librería directamente, es estable y conocido
function ProfileScreen() {
  const navigation = useNavigation();
  return <Button onPress={() => navigation.navigate('EditProfile')} />;
}
```

Si en algún punto *de verdad* cambias de librería de navegación (raro, y normalmente implica reescribir bastante de cualquier forma), ese es el momento de abstraer — no antes.

### Formularios: no armes un framework de validación genérico para un form de 3 campos

```jsx
// Sobre-ingeniería para un formulario simple de login
const validationSchema = createSchema({
  email: rule().required().email().build(),
  password: rule().required().minLength(8).build(),
});
function useGenericForm(schema) { /* ...50 líneas de motor genérico... */ }

// KISS — validación directa, legible de un vistazo
function useLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const validate = () => {
    if (!email.includes('@')) return setError('Email inválido'), false;
    if (password.length < 8) return setError('Contraseña muy corta'), false;
    return true;
  };

  return { email, setEmail, password, setPassword, error, validate };
}
```

Si el proyecto ya tiene 8+ formularios complejos, ahí sí se justifica una librería como `react-hook-form` + `zod` — pero eso es adoptar una herramienta existente y probada, no construir un motor propio desde cero (eso casi nunca se justifica).

### Theming: no creces un sistema de tokens completo antes de tener 2 temas reales

```jsx
// Sobre-ingeniería si la app no tiene dark mode planeado todavía
const ThemeContext = createContext();
function useThemedValue(lightValue, darkValue, otherThemeValue) { /* ... */ }

// KISS — colores directos en un archivo de constantes, hasta que dark mode sea real
export const colors = {
  primary: '#2D3FE0',
  background: '#FFFFFF',
  text: '#1A1F36',
};
```

Cuando dark mode entra al roadmap de verdad, ahí se justifica migrar a Context/tokens — no antes "para no tener que migrar después". Migrar después con un find-and-replace bien organizado es barato; mantener una abstracción sin uso real durante meses no lo es.

## La relación entre KISS y SOLID en esta skill

SOLID te da el vocabulario para nombrar *qué* está mal en código que ya creció demasiado (god components, props bloated, acoplamiento directo a APIs). KISS es el freno que evita aplicar esas correcciones antes de que el problema exista de verdad.

En la práctica, el orden correcto casi siempre es:
1. Escribe la versión simple.
2. Cuando el dolor aparece (componente gigante, copy-paste por tercera vez, imposible de testear), **ahí** aplica el principio SOLID específico que resuelve ese dolor puntual.
3. No aplica los cinco principios preventivamente a un componente nuevo de 40 líneas.
