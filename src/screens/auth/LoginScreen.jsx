import { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { C, S, shadow } from '../../constants/theme';

function PrimaryButton({ label, onPress, loading, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 3 }).start();

  return (
    <Pressable
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[styles.boton, disabled && styles.botonDeshabilitado, { transform: [{ scale }] }]}
      >
        <Text style={styles.botonLabel}>{loading ? 'Ingresando…' : label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const passwordRef = useRef(null);

  const onLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await login({ userId: userId.trim(), password: password.trim() });
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Marca */}
        <View style={styles.headerBloque}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetra}>A</Text>
          </View>
          <Text style={styles.titulo}>AlmcApp</Text>
          <Text style={styles.subtitulo}>ALMACÉN · SAP BUSINESS ONE</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <FormField
            label="USUARIO"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <FormField
            ref={passwordRef}
            label="CONTRASEÑA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            returnKeyType="done"
            onSubmitEditing={onLogin}
            right={
              <TextInput.Icon
                icon={passwordVisible ? 'eye-off' : 'eye'}
                color={C.textMuted}
                onPress={() => setPasswordVisible((v) => !v)}
              />
            }
          />

          {error && <Text style={styles.errorTexto}>{error}</Text>}

          <PrimaryButton label="Ingresar" onPress={onLogin} loading={loading} disabled={loading} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, ...props }) {
  return (
    <TextInput
      mode="outlined"
      label={label}
      outlineStyle={styles.inputOutline}
      style={styles.input}
      activeOutlineColor={C.primary}
      outlineColor={C.border}
      textColor={C.text}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: S.xl, gap: S.xl },

  headerBloque: { alignItems: 'center', gap: S.sm },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
  },
  logoLetra: { color: '#fff', fontSize: 28, fontWeight: '700' },
  titulo: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  subtitulo: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase',
  },

  form: { gap: S.md },
  input: { backgroundColor: C.surface },
  inputOutline: { borderRadius: 12 },

  errorTexto: {
    fontSize: 13,
    color: C.danger,
    backgroundColor: C.dangerLight,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: 8,
    overflow: 'hidden',
  },

  boton: {
    backgroundColor: C.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: S.xs,
    ...shadow.md,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonLabel: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
