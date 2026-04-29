import { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();
  const [isReadCount, setIsReadCount] = useState<number | null>(0);

  useEffect(() => {
    const fetchUnreadCount = async (setter: (count: number | null) => void) => {
      //通知の未読をカウント
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザの取得に失敗しました。');
      const { count, error: isReadError } = await supabase.from('notifications').select('id', { count: 'exact' }).eq('to_user_id', user.id).eq('is_read', false);
      if (isReadError) return Alert.alert(isReadError.message);
      else setter(count);
    };
    let channel: ReturnType<typeof supabase.channel>;

    //Android端末にapp開いている間通知が来る設定
    let unsubscribeForegroundMessage: (() => void) | undefined;
    if (!isExpoGo) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getMessaging, onMessage } = require('@react-native-firebase/messaging');
      unsubscribeForegroundMessage = onMessage(getMessaging(), async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
          },
          trigger: null,
        });
      });
    }

    const fetchSession = async () => {
      // ログイン情報を確認
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);

      // プロフィール未作成ならプロフィール設定へ
      const { data: profileData } = await supabase.from('profiles').select('user_id').eq('user_id', sessionData.session?.user.id).single();
      if (!profileData) return router.replace('/(auth)/profile-setup');

      // ルーム未参加ならルーム選択へ
      const { data: roomData } = await supabase.from('room_members').select('user_id').eq('user_id', sessionData.session?.user.id);
      if (!roomData || roomData.length === 0) return router.replace('/(auth)/room-select');

      // プッシュ通知トークンを取得してSupabaseに保存
      const { status: notificationsStatus } = await Notifications.requestPermissionsAsync();
      if (notificationsStatus !== 'granted') return setLoading(false);
      const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId });
      const { error: tokenError } = await supabase.from('profiles').update({ push_token: pushToken }).eq('user_id', sessionData.session?.user.id);
      if (tokenError) return Alert.alert(tokenError.message);

      //リアルタイム設定
      fetchUnreadCount(setIsReadCount);
      channel = supabase
        .channel('notification')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchUnreadCount(setIsReadCount);
        })
        .subscribe();
      setLoading(false);
    };
    fetchSession();
    return () => {
      unsubscribeForegroundMessage?.();
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);
  if (isLoading) return null;
  if (!isLoading && session === null) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
          tabBarBadge: isReadCount ? isReadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}
