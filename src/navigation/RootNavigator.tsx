import {
  DarkTheme as NavigationDark,
  DefaultTheme as NavigationLight,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { InventoryFiltersProvider } from '../context/InventoryFiltersContext';
import { darkTheme, lightTheme } from '../styles/theme';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainWithFilters() {
  return (
    <InventoryFiltersProvider>
      <MainTabs />
    </InventoryFiltersProvider>
  );
}

function StackRoutes() {
  const { user } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainWithFilters} />
          <Stack.Screen
            name="Chatbot"
            component={ChatbotScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { mode } = useThemeMode();

  const navigationTheme = useMemo(() => {
    if (mode === 'dark') {
      return {
        ...NavigationDark,
        colors: {
          ...NavigationDark.colors,
          primary: darkTheme.colors.primary,
          background: darkTheme.colors.background,
          card: darkTheme.colors.surface,
          text: darkTheme.colors.text,
          border: darkTheme.colors.border,
          notification: darkTheme.colors.primary,
        },
      };
    }
    return {
      ...NavigationLight,
      colors: {
        ...NavigationLight.colors,
        primary: lightTheme.colors.primary,
        background: lightTheme.colors.background,
        card: lightTheme.colors.surface,
        text: lightTheme.colors.text,
        border: lightTheme.colors.border,
        notification: lightTheme.colors.primary,
      },
    };
  }, [mode]);

  return (
    <AuthProvider>
      <NavigationContainer theme={navigationTheme}>
        <StackRoutes />
      </NavigationContainer>
    </AuthProvider>
  );
}
