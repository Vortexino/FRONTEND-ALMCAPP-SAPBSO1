import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

export default function WarehouseSelectorScreen() {
  const { user, switchWarehouse, logout } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [switching, setSwitching]   = useState(null); // code del que está cargando
  const [error, setError]           = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === 'admin') {
          // Admin: cargar todos los almacenes desde SAP
          const data = await authService.getWarehouses();
          setWarehouses(data ?? []);
        } else {
          // Manager/operator: usar los del token
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
  }, [user]);

  const onSelect = async (code) => {
    setSwitching(code);
    setError(null);
    const res = await switchWarehouse({ warehouseCode: code });
    if (!res.ok) {
      setError(res.error);
      setSwitching(null);
    }
    // Si ok, el Navigator detecta el nuevo warehouseCode y navega a Home automáticamente
  };

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="warehouse" size={26} color="#fff" />
        </View>
        <Text style={styles.titulo}>Selecciona tu almacén</Text>
        <Text style={styles.subtitulo}>
          {user?.role === 'admin'
            ? 'Como administrador puedes acceder a cualquier almacén.'
            : `Tienes acceso a ${warehouses.length} almacén${warehouses.length !== 1 ? 'es' : ''}.`}
        </Text>
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: S.xxl }} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {warehouses.map((wh) => {
            const isLoading = switching === wh.code;
            return (
              <Pressable
                key={wh.code}
                onPress={() => !switching && onSelect(wh.code)}
                style={({ pressed }) => [
                  styles.card,
                  shadow.sm,
                  pressed && !switching && { opacity: 0.85 },
                  switching && switching !== wh.code && { opacity: 0.4 },
                ]}
              >
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons
                    name="store-outline"
                    size={22}
                    color={C.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{wh.name}</Text>
                  <Text style={styles.cardCode}>Código {wh.code}</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator color={C.primary} size="small" />
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
                )}
              </Pressable>
            );
          })}

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Cerrar sesión */}
      <Pressable
        onPress={logout}
        style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.6 }]}
      >
        <MaterialCommunityIcons name="logout" size={15} color={C.textSec} />
        <Text style={styles.logoutLabel}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bg },

  header: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: S.xl,
    paddingBottom: S.xl,
    gap: S.sm,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm,
    ...shadow.md,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
  },
  titulo: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  subtitulo: {
    fontSize: 13,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 19,
  },

  lista: { paddingHorizontal: S.lg, paddingTop: S.md, gap: S.md, paddingBottom: S.xxxl },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: S.base,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '600', color: C.text },
  cardCode: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.dangerLight,
    borderRadius: 10,
    padding: S.md,
  },
  errorText: { fontSize: 13, color: C.danger, flex: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.xs,
    paddingVertical: S.lg,
    paddingBottom: 36,
  },
  logoutLabel: { fontSize: 13, color: C.textSec, fontWeight: '500' },
});
