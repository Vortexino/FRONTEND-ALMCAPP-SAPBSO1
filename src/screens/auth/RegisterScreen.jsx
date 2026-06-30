import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRegister } from '../../hooks/useRegister';
import { C, S, shadow } from '../../constants/theme';

// ── Campo de texto reutilizable ────────────────────────────────────────────────
function Field({ label, ...props }) {
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

// ── Chip de rol ────────────────────────────────────────────────────────────────
function RoleChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

// ── Fila de almacén seleccionable ──────────────────────────────────────────────
function WarehouseRow({ code, name, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.warehouseRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.warehouseCheck, selected && styles.warehouseCheckSelected]}>
        {selected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.warehouseName}>{name}</Text>
        <Text style={styles.warehouseCode}>{code}</Text>
      </View>
    </Pressable>
  );
}

// ── Pantalla de registro ───────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { ROLES, warehouses, loadingWH, form, submitting, error, success, setField, toggleWarehouse, submit } = useRegister();
  const nameRef     = useRef(null);
  const passwordRef = useRef(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const needsWarehouses = form.role !== 'admin';

  const onSubmit = async () => {
    const result = await submit();
    if (result.ok) setTimeout(() => navigation.goBack(), 1800);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Datos básicos */}
        <View style={styles.seccion}>
          <Text style={styles.seccionLabel}>DATOS DE ACCESO</Text>
          <Field
            label="ID de usuario"
            value={form.userId}
            onChangeText={(v) => setField('userId', v)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
          />
          <Field
            ref={nameRef}
            label="Nombre completo"
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Field
            ref={passwordRef}
            label="Contraseña inicial"
            value={form.password}
            onChangeText={(v) => setField('password', v)}
            secureTextEntry={!passwordVisible}
            returnKeyType="done"
            right={
              <TextInput.Icon
                icon={passwordVisible ? 'eye-off' : 'eye'}
                color={C.textMuted}
                onPress={() => setPasswordVisible((v) => !v)}
              />
            }
          />
        </View>

        {/* Rol */}
        <View style={styles.seccion}>
          <Text style={styles.seccionLabel}>ROL</Text>
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <RoleChip
                key={r.value}
                label={r.label}
                selected={form.role === r.value}
                onPress={() => setField('role', r.value)}
              />
            ))}
          </View>
        </View>

        {/* Almacenes */}
        {needsWarehouses && (
          <View style={styles.seccion}>
            <View style={styles.seccionHeaderRow}>
              <Text style={styles.seccionLabel}>ALMACENES ASIGNADOS</Text>
              {form.warehouseCodes.length > 0 && (
                <Text style={styles.seleccionados}>{form.warehouseCodes.length} seleccionados</Text>
              )}
            </View>
            {loadingWH ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: S.lg }} />
            ) : (
              <View style={[styles.warehouseList, shadow.sm]}>
                {warehouses.map((wh, idx) => (
                  <View key={wh.code}>
                    {idx > 0 && <View style={styles.separator} />}
                    <WarehouseRow
                      code={wh.code}
                      name={wh.name}
                      selected={form.warehouseCodes.includes(wh.code)}
                      onPress={() => toggleWarehouse(wh.code)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Feedback */}
        {error && (
          <View style={styles.feedbackBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={C.danger} />
            <Text style={styles.feedbackError}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={[styles.feedbackBox, styles.feedbackSuccessBox]}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color={C.success} />
            <Text style={styles.feedbackSuccess}>{success}</Text>
          </View>
        )}

        {/* Botón */}
        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [styles.boton, (submitting || pressed) && { opacity: 0.75 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.botonLabel}>Crear usuario</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: S.lg, paddingBottom: S.xxxl, gap: S.xl },

  seccion: { gap: S.md },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seccionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  seleccionados: { fontSize: 11, fontWeight: '600', color: C.primary },

  input: { backgroundColor: C.surface },
  inputOutline: { borderRadius: 12 },

  chipRow: { flexDirection: 'row', gap: S.sm },
  chip: {
    paddingHorizontal: S.base,
    paddingVertical: S.sm,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipLabel: { fontSize: 13, fontWeight: '600', color: C.textSec },
  chipLabelSelected: { color: '#fff' },

  warehouseList: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  warehouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingHorizontal: S.base,
    paddingVertical: S.md,
  },
  warehouseCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  warehouseCheckSelected: { backgroundColor: C.primary, borderColor: C.primary },
  warehouseName: { fontSize: 14, fontWeight: '500', color: C.text },
  warehouseCode: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  separator: { height: 1, backgroundColor: C.border, marginHorizontal: S.base },

  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.dangerLight,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: 10,
  },
  feedbackSuccessBox: { backgroundColor: C.successLight },
  feedbackError:   { fontSize: 13, color: C.danger,  flex: 1 },
  feedbackSuccess: { fontSize: 13, color: C.success, flex: 1 },

  boton: {
    backgroundColor: C.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    ...shadow.md,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
  },
  botonLabel: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
