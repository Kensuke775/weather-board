import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { RoomProvider } from '@/context/RoomContext';
import '@/global.css';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);

  //fetchSession は「すでにログイン済みのセッションがSupabaseに残っていれば取得する」だけです。アプリを再起動したときに「前回ログインしたままか？」を確認するイメージです。
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    fetchSession();
    //login.tsx で signInWithPassword が成功する → Supabaseがセッションを発行 → onAuthStateChange が変化を検知 → コールバックが呼ばれて setSession でセッションが更新される、という流れです。
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    //return で返した関数は、コンポーネントが画面から取り除かれるとき（アンマウント＝画面から消えるとき）に呼ばれます。
    return () => subscription.unsubscribe();
  }, []);
  return (
    <GluestackUIProvider mode="light">
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RoomProvider>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
          </Stack>
        <Toast position="bottom" bottomOffset={40} />

        </RoomProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
