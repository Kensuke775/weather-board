import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Platform, View } from 'react-native';

import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const backgroundImage = require('@/assets/images/weather/sunny.png');

if (!(isExpoGo && Platform.OS === 'android')) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const fetchUnreadCount = async (userId: string, setter: (count: number | null) => void) => {
  const { count, error: isReadError } = await supabase.from('notifications').select('id', { count: 'exact' }).eq('to_user_id', userId).eq('is_read', false);
  if (isReadError) {
    console.error('[_layout(tabs)] fetchUnreadCount', isReadError.message);
    Alert.alert('通知の取得に失敗しました。');
    return;
  }
  setter(count);
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { user, isLoading: isUserLoading } = useUser();
  const userId = user?.id;
  const [unreadCount, setUnreadCount] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    let unsubscribeForegroundMessage: (() => void) | undefined;
    if (!isExpoGo && Platform.OS === 'android') {
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
      try {
        if (!userId) return;
        const { data: profileData, error: profileError } = await supabase.from('profiles').select('user_id').eq('user_id', userId).maybeSingle();
        if (profileError) {
          console.error('[_layout(tabs)] fetchSession', profileError.message);
          Alert.alert('プロフィールの取得に失敗しました。');
          return;
        }
        if (!profileData) return router.replace('/(auth)/eula');
        const { data: roomData, error: roomError } = await supabase.from('room_members').select('user_id').eq('user_id', userId);
        if (roomError) {
          console.error('[_layout(tabs)] fetchSession', roomError.message);
          Alert.alert('ルームの取得に失敗しました。');
          return;
        }
        if (!roomData || roomData.length === 0) return router.replace('/(auth)/room-setup');
        const { status: notificationsStatus } = await Notifications.requestPermissionsAsync();
        if (notificationsStatus !== 'granted') return;
        try {
          const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId });
          const { error: tokenError } = await supabase.from('profiles').update({ push_token: pushToken }).eq('user_id', userId);
          if (tokenError) {
            console.error('[_layout(tabs)] fetchSession', tokenError.message);
            Alert.alert('プッシュトークンのアップデートに失敗しました。');
            return;
          }
        } catch {
          // プッシュトークン取得失敗は無視
        }
        await fetchUnreadCount(userId, setUnreadCount);
        const channelName = `notification-${userId}`;
        const existing = supabase.getChannels().find((channel) => channel.subTopic === channelName);
        if (existing) await supabase.removeChannel(existing);
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
            await fetchUnreadCount(userId, setUnreadCount);
          })
          .subscribe();
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
    return () => {
      unsubscribeForegroundMessage?.();
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, userId]);

  if (isLoading || isUserLoading)
    return (
      <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center">
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }} />
        <ActivityIndicator size="large" color="white" />
      </ImageBackground>
    );
  if (!userId) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#624221',
        tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          position: 'absolute',
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'android' ? 4 : bottom - 4,
          borderRadius: 28,
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarBackground: () => null,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          tabBarActiveTintColor: '#624221',
          tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'ポスト',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="square.and.pencil" color={color} />,
          tabBarActiveTintColor: '#624221',
          tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
          tabBarBadge: unreadCount ? unreadCount : undefined,
          tabBarActiveTintColor: '#624221',
          tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          tabBarActiveTintColor: '#624221',
          tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: '分析',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wand.and.stars" color={color} />,
          tabBarActiveTintColor: '#624221',
          tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          tabBarActiveTintColor: '#624221',
          tabBarInactiveTintColor: 'rgba(98,66,33,0.4)',
        }}
      />
    </Tabs>
  );
}
