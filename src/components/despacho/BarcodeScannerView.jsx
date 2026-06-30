import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, S } from '../../constants/theme';
import HidScannerInput from '../shared/HidScannerInput';

// rss14/rssexpanded no están en el enum BarcodeType de expo-camera v17 (Android MLKit)
const TIPOS_CODIGO = [
  'qr',
  'code128', 'code39', 'code93',
  'ean13', 'ean8',
  'upc_a', 'upc_e',
  'itf14',
];

export default function BarcodeScannerView({ visible, onClose, onScanned, title = 'Escanear código' }) {
  const [permission, requestPermission] = useCameraPermissions();
  const bloqueado = useRef(false);

  useEffect(() => {
    if (visible) bloqueado.current = false;
  }, [visible]);

  if (!visible) return null;

  const handleScan = ({ data }) => {
    if (bloqueado.current) return;
    bloqueado.current = true;
    onScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission?.granted ? (
          <View style={styles.permisoWrap}>
            <View style={styles.permisoIconCircle}>
              <MaterialCommunityIcons name="camera-off" size={32} color={C.textMuted} />
            </View>
            <Text style={styles.permisoTitulo}>Acceso a la cámara</Text>
            <Text style={styles.permisoDesc}>
              Necesitamos permiso para escanear los códigos de barras.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [styles.permisoBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.permisoBtnLabel}>Conceder acceso</Text>
            </Pressable>
            <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.65 }]}>
              <Text style={styles.cancelarLink}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Scanner físico HID: captura input de teclado mientras el modal está abierto */}
            <HidScannerInput onScanned={(code) => handleScan({ data: code })} />

            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: TIPOS_CODIGO }}
              onBarcodeScanned={handleScan}
            />

            {/* Mira de escaneo */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.miraCentro}>
                <View style={styles.miraBox}>
                  {/* Esquinas */}
                  <View style={[styles.esquina, styles.esqTopLeft]} />
                  <View style={[styles.esquina, styles.esqTopRight]} />
                  <View style={[styles.esquina, styles.esqBottomLeft]} />
                  <View style={[styles.esquina, styles.esqBottomRight]} />
                </View>
              </View>
            </View>

            {/* Overlay inferior */}
            <View style={styles.overlay}>
              <Text style={styles.overlayTitulo}>{title}</Text>
              <Text style={styles.overlayHint}>Alineá el código dentro del recuadro</Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.cerrarBtn, pressed && { opacity: 0.75 }]}
              >
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
                <Text style={styles.cerrarBtnLabel}>Cancelar</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const CORNER = 22;
const BORDER_W = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  // Mira
  miraCentro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  miraBox: { width: 240, height: 180, position: 'relative' },
  esquina: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  esqTopLeft:     { top: 0,  left: 0,  borderTopWidth: BORDER_W, borderLeftWidth: BORDER_W,   borderTopLeftRadius: 6 },
  esqTopRight:    { top: 0,  right: 0, borderTopWidth: BORDER_W, borderRightWidth: BORDER_W,  borderTopRightRadius: 6 },
  esqBottomLeft:  { bottom: 0, left: 0,  borderBottomWidth: BORDER_W, borderLeftWidth: BORDER_W,  borderBottomLeftRadius: 6 },
  esqBottomRight: { bottom: 0, right: 0, borderBottomWidth: BORDER_W, borderRightWidth: BORDER_W, borderBottomRightRadius: 6 },

  // Overlay inferior
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: S.xl,
    paddingBottom: S.xxxl,
    paddingHorizontal: S.xl,
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: 'rgba(15,26,46,0.72)',
  },
  overlayTitulo: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  overlayHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' },
  cerrarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    marginTop: S.sm,
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingHorizontal: S.xl,
    paddingVertical: 11,
  },
  cerrarBtnLabel: { color: C.text, fontWeight: '700', fontSize: 14 },

  // Permiso
  permisoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    padding: S.xl,
    gap: S.md,
  },
  permisoIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm,
  },
  permisoTitulo: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  permisoDesc: { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 20 },
  permisoBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: S.xl,
    paddingVertical: 13,
    marginTop: S.sm,
  },
  permisoBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelarLink: { fontSize: 14, color: C.textSec, fontWeight: '600', marginTop: S.xs },
});
