import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { C } from './src/constants/theme';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: C.primary,
    onPrimary: '#ffffff',
    primaryContainer: C.primaryLight,
    onPrimaryContainer: C.primary,
    secondary: C.primaryDim,
    background: C.bg,
    surface: C.surface,
    surfaceVariant: C.bg,
    outline: C.border,
    onSurface: C.text,
    onSurfaceVariant: C.textSec,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <AppNavigator />
        <StatusBar style="auto" />
        <Toast />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
