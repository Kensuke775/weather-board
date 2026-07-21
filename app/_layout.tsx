import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import 'react-native-reanimated';

import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
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
import { supabase } from '@/lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    const handlePasswordRecoveryUrl = async (url: string) => {
      const hash = url.split('#')[1];
      if (!hash) return;
      const params = new URLSearchParams(hash);
      if (params.get('type') !== 'recovery') return;
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) return;
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      router.replace('/(auth)/reset-password');
    };

    Linking.getInitialURL().then((url) => { if (url) handlePasswordRecoveryUrl(url); });
    const subscription = Linking.addEventListener('url', ({ url }) => handlePasswordRecoveryUrl(url));
    return () => subscription.remove();
  }, []);

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
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none', title: '設定' }} />
                    <Stack.Screen
                      name="profile-edit"
                      options={{
                        title: 'プロフィール編集',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen name="weather-log/[weather_log_id]" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="room-setup"
                      options={{
                        title: 'ルーム設定',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="user-profile"
                      options={{
                        title: '',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="follow-list"
                      options={{
                        title: '',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="block-list"
                      options={{
                        title: 'ブロック一覧',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="terms"
                      options={{
                        title: '利用規約',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="privacy-policy"
                      options={{
                        title: 'プライバシーポリシー',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="room-chat/index"
                      options={{
                        title: 'トーク',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="room-chat/[room_id]"
                      options={{
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="dm-chat/[conversation_id]"
                      options={{
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
                    <Stack.Screen
                      name="japan-map"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="prefecture-users"
                      options={{
                        title: '',
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: 'rgba(96, 165, 250)',
                        headerTitleStyle: { color: '#000000' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerShadowVisible: false,
                      }}
                    />
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
