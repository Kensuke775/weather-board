import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { RoomProvider } from '@/context/RoomContext';
import { UserProvider } from '@/context/UserContext';
import '@/global.css';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const toastConfig = {
    success: (props: BaseToastProps) => <BaseToast {...props} style={{ width: '90%', marginHorizontal: '5%' }} />,
  };
  return (
    <GluestackUIProvider mode="light">
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <UserProvider>
          <RoomProvider>
            <KeyboardProvider statusBarTranslucent>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <BottomSheetModalProvider>
                  <Stack>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                    <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
                    <Stack.Screen name="weather-log/[weather_log_id]" options={{ headerShown: false }} />
                  </Stack>
                  <Toast position="bottom" bottomOffset={40} config={toastConfig} />
                </BottomSheetModalProvider>
              </GestureHandlerRootView>
            </KeyboardProvider>
          </RoomProvider>
        </UserProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
