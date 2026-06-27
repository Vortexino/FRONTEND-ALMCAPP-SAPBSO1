import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ITEM_AVAILABILITY } from '../../store/pedidosStore';
import { C, S, shadow } from '../../constants/theme';

const OPCIONES = [
  { value: ITEM_AVAILABILITY.AVAILABLE,      label: 'Disponible', icon: 'check',           color: C.success, bg: C.successLight },
  { value: ITEM_AVAILABILITY.NEEDS_TRANSFER, label: 'Traslado',   icon: 'swap-horizontal', color: C.warn,    bg: C.warnLight },
  { value: ITEM_AVAILABILITY.UNAVAILABLE,    label: 'Sin stock',  icon: 'close',           color: C.danger,  bg: C.dangerLight },
];

function OptionButton({ option, selected, onPress, disabled }) {
  const active = selected === option.value;
  return (
    <Pressable
      onPress={() => !disabled && onPress(option.value)}
      style={({ pressed }) => [
        styles.optBtn,
        active && [styles.optBtnActive, { backgroundColor: option.bg, borderColor: option.color }],
        pressed && !disabled && { opacity: 0.75 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <MaterialCommunityIcons
        name={option.icon}
        size={14}
        color={active ? option.color : C.textSec}
      />
      <Text style={[styles.optLabel, active && { color: option.color, fontWeight: '700' }]}>
        {option.label}
      </Text>
    </Pressable>
  );
}

export default function ItemAvailabilityRow({ item, onUpdate, disabled }) {
  const [selected, setSelected] = useState(
    item.availability === ITEM_AVAILABILITY.PENDING ? null : item.availability
  );
  const [note, setNote] = useState(item.transferNote ?? '');
  const [saving, setSaving] = useState(false);

  const onSeleccionar = async (valor) => {
    setSelected(valor);
    setSaving(true);
    await onUpdate(item.lineNum, { availability: valor, transferNote: note });
    setSaving(false);
  };

  const onGuardarNota = async () => {
    if (!selected) return;
    setSaving(true);
    await onUpdate(item.lineNum, { availability: selected, transferNote: note });
    setSaving(false);
  };

  const pendiente = selected === null;

  return (
    <View style={[styles.row, pendiente && styles.rowPendiente]}>
      {/* Indicador lateral */}
      <View style={[styles.acento, { backgroundColor: pendiente ? C.border : C.primary }]} />

      <View style={styles.body}>
        {/* Encabezado */}
        <View style={styles.topRow}>
          <Text style={styles.codigo}>{item.itemCode}</Text>
          <Text style={styles.qty}>×{item.quantity}</Text>
        </View>

        {item.itemDescription ? (
          <Text style={styles.descripcion} numberOfLines={1}>{item.itemDescription}</Text>
        ) : null}

        {(item.sapStock != null || item.netAvailable != null) && (
          <View style={styles.stockRow}>
            {item.sapStock != null && (
              <Text style={styles.stockLabel}>Stock SAP: <Text style={styles.stockVal}>{item.sapStock}</Text></Text>
            )}
            {item.netAvailable != null && (
              <Text style={styles.stockLabel}>Neto: <Text style={styles.stockVal}>{item.netAvailable}</Text></Text>
            )}
          </View>
        )}

        {/* Botones de disponibilidad */}
        <View style={styles.optsRow}>
          {OPCIONES.map((opt) => (
            <OptionButton
              key={opt.value}
              option={opt}
              selected={selected}
              onPress={onSeleccionar}
              disabled={disabled || saving}
            />
          ))}
        </View>

        {/* Nota de traslado */}
        {selected === ITEM_AVAILABILITY.NEEDS_TRANSFER && (
          <View style={styles.notaFila}>
            <TextInput
              style={styles.notaInput}
              mode="outlined"
              dense
              placeholder="Nota de traslado (opcional)"
              value={note}
              onChangeText={setNote}
              onEndEditing={onGuardarNota}
              disabled={disabled || saving}
              outlineStyle={{ borderRadius: 8 }}
              activeOutlineColor={C.primary}
              outlineColor={C.border}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: S.base,
    marginVertical: 5,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadow.sm,
  },
  rowPendiente: {
    borderWidth: 1,
    borderColor: C.border,
  },
  acento: { width: 4 },
  body: { flex: 1, padding: S.md, gap: S.xs },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codigo: { fontSize: 14, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  qty: { fontSize: 13, fontWeight: '600', color: C.primary },
  descripcion: { fontSize: 13, color: C.textSec },

  stockRow: { flexDirection: 'row', gap: S.md },
  stockLabel: { fontSize: 11, color: C.textMuted },
  stockVal: { fontWeight: '600', color: C.text },

  optsRow: { flexDirection: 'row', gap: S.xs, marginTop: 4 },
  optBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  optBtnActive: { borderWidth: 1.5 },
  optLabel: { fontSize: 11, fontWeight: '600', color: C.textSec },

  notaFila: { marginTop: 4 },
  notaInput: { backgroundColor: C.surface },
});
