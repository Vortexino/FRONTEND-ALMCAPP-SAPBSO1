import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '../constants/routes';
import DespachoListScreen from '../screens/despacho/DespachoListScreen';
import DespachoDetailScreen from '../screens/despacho/DespachoDetailScreen';
import DespachoConfirmScreen from '../screens/despacho/DespachoConfirmScreen';

const Stack = createNativeStackNavigator();

// STUB/compartido: por ahora solo registra el stack de Despacho. Cuando se integre
// el módulo de Pedidos del compañero, coordinar antes de modificar esta estructura
// (sección 13 del contexto: ambos stacks conviven en este mismo navigator).
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={ROUTES.DESPACHO_LIST}>
        <Stack.Screen name={ROUTES.DESPACHO_LIST} component={DespachoListScreen} options={{ title: 'Despachos' }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
