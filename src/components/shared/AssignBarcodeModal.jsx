import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { assignBarcode } from '../../api/itemsService';
import BarcodeScannerView from '../despacho/BarcodeScannerView';
import { C, S, shadow } from '../../constants/theme';

/**
 * Modal de asignación de código de barras en caliente durante el picking.
 * Usado tanto en Despacho (ProductoItem) como en Pedidos (ItemAvailabilityRow).
 *
 * Props:
 *   visible      boolean
 *   item         { itemCode, description?, itemDescription? }
 *   onClose      () => void
 *   onSuccess    (barcode: string) => void   — llamado tras asignación exitosa
 */
export default function AssignBarcodeModal({ visible, item, onClose, onSuccess }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setBarcodeInput('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const descripcion = item?.description ?? item?.itemDescription ?? '';

  const onAsociar = useCallback(async () => {
    const barcode = barcodeInput.trim();
    if (!barcode || !item?.itemCode) return;
    setLoading(true);
    try {
      await assignBarcode(item.itemCode, barcode);
      Toast.show({ type: 'success', text1: `Código ${barcode} asociado a ${item.itemCode}` });
      onSuccess(barcode);
      onClose();
    } catch (error) {
      const msg = error?.response?.data?.error || 'Error al asociar el código. Intenta de nuevo.';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setLoading(false);
    }
  }, [barcodeInput, item, onSuccess, onClose]);

  const onScanned = useCallback(
    (codigo) => {
      setScannerVisible(false);
      setBarcodeInput(codigo);
    },
    []
  );

  if (!item) return null;

  return (
    <>
      <Modal
        visible={visible && !scannerVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, shadow.md]} onPress={() => {}}>
            {/* Encabezado */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="barcode-scan" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>Asignar código de barras</Text>
                <Text style={styles.itemCode}>{item.itemCode}</Text>
                {descripcion ? (
                  <Text style={styles.desc} numberOfLines={1}>{descripcion}</Text>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={20} color={C.textMuted} />
              </Pressable>
            </View>

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                mode="outlined"
                placeholder="Escanea o escribe el nuevo código"
                value={barcodeInput}
                onChangeText={setBarcodeInput}
                onSubmitEditing={onAsociar}
                returnKeyType="done"
                outlineStyle={{ borderRadius: 12 }}
                activeOutlineColor={C.primary}
                outlineColor={C.border}
                right={
                  loading
                    ? <TextInput.Icon icon={() => <ActivityIndicator size={16} color={C.textMuted} />} />
                    : null
                }
              />
              <Pressable
                onPress={() => setScannerVisible(true)}
                style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="camera" size={20} color={C.primary} />
              </Pressable>
            </View>

            {/* Acción */}
            <Button
              mode="contained"
              onPress={onAsociar}
              loading={loading}
              disabled={loading || !barcodeInput.trim()}
              style={styles.btnAsociar}
            >
              Guardar en SAP
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <BarcodeScannerView
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={onScanned}
        title="Escanea el código de barras"
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,26,46,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: S.base,
    gap: S.md,
    paddingBottom: S.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 14, fontWeight: '700', color: C.text },
  itemCode: { fontSize: 12, fontWeight: '600', color: C.primaryDim, marginTop: 1 },
  desc: { fontSize: 12, color: C.textSec, marginTop: 1 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  input: { flex: 1, backgroundColor: C.surface, height: 48 },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnAsociar: { borderRadius: 12 },
});
