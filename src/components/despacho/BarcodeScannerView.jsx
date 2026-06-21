import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Text } from 'react-native-paper';

const TIPOS_CODIGO = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'];

// Componente reutilizable de escaneo: lo usa tanto el buscador de
// DespachoListScreen (código de barras del papel físico) como el picking
// guiado de DespachoDetailScreen (escaneo de artículos).
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
          <View style={styles.permisoContainer}>
            <Text variant="bodyLarge" style={styles.permisoTexto}>
              Se necesita acceso a la cámara para escanear códigos.
            </Text>
            <Button mode="contained" onPress={requestPermission} style={styles.boton}>
              Conceder permiso
            </Button>
            <Button mode="text" onPress={onClose}>
              Cancelar
            </Button>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: TIPOS_CODIGO }}
              onBarcodeScanned={handleScan}
            />
            <View style={styles.overlay}>
              <Text variant="titleMedium" style={styles.overlayTexto}>
                {title}
              </Text>
              <Button mode="contained" onPress={onClose} style={styles.boton}>
                Cancelar
              </Button>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTexto: { color: '#fff', marginBottom: 12 },
  boton: { marginTop: 8, minWidth: 180 },
  permisoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  permisoTexto: { color: '#fff', textAlign: 'center' },
});
