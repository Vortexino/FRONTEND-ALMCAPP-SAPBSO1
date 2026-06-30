import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { C } from '../constants/theme';

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import DashboardScreen from '../screens/home/DashboardScreen';
import PedidosListScreen from '../screens/pedidos/PedidosListScreen';
import PedidosDetailScreen from '../screens/pedidos/PedidosDetailScreen';
import PedidosReviewScreen from '../screens/pedidos/PedidosReviewScreen';
import DespachoListScreen from '../screens/despacho/DespachoListScreen';
import DespachoDetailScreen from '../screens/despacho/DespachoDetailScreen';
import DespachoConfirmScreen from '../screens/despacho/DespachoConfirmScreen';
import ItemBarcodeScreen from '../screens/items/ItemBarcodeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const headerTheme = {
    headerStyle: { backgroundColor: C.surface },
    headerTintColor: C.primary,
    headerTitleStyle: { fontWeight: '700', color: C.text, fontSize: 16 },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={headerTheme}>
        {!user ? (
          <Stack.Screen
            name={ROUTES.LOGIN}
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name={ROUTES.HOME}
              component={HomeScreen}
              options={{ title: 'AlmcApp', headerLeft: () => null }}
            />

            {/* Dashboard */}
            <Stack.Screen
              name={ROUTES.DASHBOARD}
              component={DashboardScreen}
              options={{ title: 'Métricas' }}
            />

            {/* Pedidos */}
            <Stack.Screen
              name={ROUTES.PEDIDOS_LIST}
              component={PedidosListScreen}
              options={{ title: 'Pedidos' }}
            />
            <Stack.Screen
              name={ROUTES.PEDIDOS_DETAIL}
              component={PedidosDetailScreen}
              options={{ title: 'Detalle de pedido' }}
            />
            <Stack.Screen
              name={ROUTES.PEDIDOS_REVIEW}
              component={PedidosReviewScreen}
              options={{ title: 'Revisión' }}
            />

            {/* Despacho */}
            <Stack.Screen
              name={ROUTES.DESPACHO_LIST}
              component={DespachoListScreen}
              options={{ title: 'Despachos' }}
            />
            <Stack.Screen
              name={ROUTES.DESPACHO_DETAIL}
              component={DespachoDetailScreen}
              options={{ title: 'Picking' }}
            />
            <Stack.Screen
              name={ROUTES.DESPACHO_CONFIRM}
              component={DespachoConfirmScreen}
              options={{ title: 'Confirmar despacho' }}
            />

            {/* Catálogo */}
            <Stack.Screen
              name={ROUTES.ITEM_BARCODE}
              component={ItemBarcodeScreen}
              options={{ title: 'Códigos de barra' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
