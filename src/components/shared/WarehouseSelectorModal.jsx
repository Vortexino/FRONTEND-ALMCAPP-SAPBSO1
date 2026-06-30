import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../api/authService';
import { C, S, shadow } from '../../constants/theme';

export default function WarehouseSelectorModal({ visible }) {
  const { user, switchWarehouse } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [switching, setSwitching]   = useState(null);
  const [error, setError]           = useState(null);

  // Resetear estado interno cada vez que el modal abre
  useEffect(() => {
    if (!visible) return;
    setSwitching(null);
    setError(null);
    const load = async () => {
      setLoading(true);
      try {
        if (user?.role === 'admin') {
          const data = await authService.getWarehouses();
          setWarehouses(data ?? []);
        } else {
          const codes = user?.warehouseCodes ?? [];
          setWarehouses(codes.map((code) => ({ code, name: code })));
        }
      } catch {
        setError('No se pudieron cargar los almacenes.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [visible, user]);

  const onSelect = async (code) => {
    if (switching) return;
    setSwitching(code);
    setError(null);
    const res = await switchWarehouse({ warehouseCode: code });
    setSwitching(null); // siempre resetear, éxito o error
    if (!res.ok) setError(res.error);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.sheet, shadow.md]}>
          {/* Título */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="warehouse" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Selecciona un almacén</Text>
              <Text style={styles.subtitulo}>
                {user?.role === 'admin'
                  ? 'Elige el almacén en el que vas a trabajar.'
                  : 'Tienes acceso a varios almacenes.'}
              </Text>
            </View>
          </View>

          {/* Lista */}
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: S.xl }} />
          ) : (
            <ScrollView
              style={styles.lista}
              contentContainerStyle={{ gap: S.sm }}
              showsVerticalScrollIndicator={false}
            >
              {warehouses.map((wh) => {
                const isActive = switching === wh.code;
                return (
                  <Pressable
                    key={wh.code}
                    onPress={() => onSelect(wh.code)}
                    style={({ pressed }) => [
                      styles.item,
                      pressed && !switching && { opacity: 0.8 },
                      switching && !isActive && { opacity: 0.35 },
                    ]}
                  >
                    <View style={styles.itemCode}>
                      <Text style={styles.itemCodeText}>{wh.code}</Text>
                    </View>
                    <Text style={styles.itemName} numberOfLines={1}>{wh.name}</Text>
                    {isActive
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : <MaterialCommunityIcons name="chevron-right" size={18} color={C.textMuted} />
                    }
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,26,46,0.55)',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
  sheet: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: S.lg,
    maxHeight: '75%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md,
    marginBottom: S.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo:   { fontSize: 16, fontWeight: '700', color: C.text },
  subtitulo:{ fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 17 },

  lista: { maxHeight: 320 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: S.md,
    paddingHorizontal: S.base,
  },
  itemCode: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCodeText: { fontSize: 12, fontWeight: '700', color: C.primary },
  itemName:     { flex: 1, fontSize: 14, fontWeight: '500', color: C.text },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    marginTop: S.md,
    backgroundColor: C.dangerLight,
    borderRadius: 8,
    padding: S.sm,
  },
  errorText: { fontSize: 12, color: C.danger, flex: 1 },
});
