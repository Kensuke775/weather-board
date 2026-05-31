import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, View } from 'react-native';

import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Session } from '@supabase/supabase-js';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Redirect, Tabs, useRouter } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, WeatherBoardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const backgroundImage = require('@/assets/images/weather/sunny.png');

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
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number | null>(0);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    let channel: ReturnType<typeof supabase.channel>;
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
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[_layout(tabs)] fetchSession', sessionError.message);
          Alert.alert('セッションの取得に失敗しました。');
          return;
        }
        if(!sessionData.session) return;
        setSession(sessionData.session);
        const { data: profileData, error: profileError } = await supabase.from('profiles').select('user_id').eq('user_id', sessionData.session.user.id).maybeSingle();
        if (profileError) {
          console.error('[_layout(tabs)] fetchSession', profileError.message);
          Alert.alert('プロフィールの取得に失敗しました。');
          return;
        }
        if (!profileData) return router.replace('/(auth)/profile-setup');
        const { data: roomData, error: roomError } = await supabase.from('room_members').select('user_id').eq('user_id', sessionData.session.user.id);
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
          const { error: tokenError } = await supabase.from('profiles').update({ push_token: pushToken }).eq('user_id', sessionData.session.user.id);
          if (tokenError) {
            console.error('[_layout(tabs)] fetchSession', tokenError.message);
            Alert.alert('プッシュトークンのアップデートに失敗しました。');
            return;
          }
        } catch {
          // プッシュトークン取得失敗は無視
        }
        fetchUnreadCount(sessionData.session.user.id, setUnreadCount);
        const channelName = `notification-${sessionData.session.user.id}`;
        const existing = supabase.getChannels().find((channel) => channel.subTopic === channelName);
        if (existing) await supabase.removeChannel(existing);
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
            fetchUnreadCount(sessionData.session.user.id, setUnreadCount);
          })
          .subscribe();
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
    return () => {
      subscription.unsubscribe();
      unsubscribeForegroundMessage?.();
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  if (isLoading)
    return (
      <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center">
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
        <ActivityIndicator size="large" color="white" />
      </ImageBackground>
    );
  if (!isLoading && session === null) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: WeatherBoardColors.glassBackground,
          borderTopColor: WeatherBoardColors.glassBorder,
          borderTopWidth: 1,
          position: 'absolute',
          paddingTop: 4,
          paddingHorizontal: 10,
        },
        tabBarBackground: () => <BlurView intensity={40} tint="light" style={{ flex: 1 }} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          tabBarActiveTintColor: WeatherBoardColors.textPrimary,
          tabBarInactiveTintColor: WeatherBoardColors.textMutedGlay,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'ポスト',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
          tabBarActiveTintColor: WeatherBoardColors.textPrimary,
          tabBarInactiveTintColor: WeatherBoardColors.textMutedGlay,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
          tabBarBadge: unreadCount ? unreadCount : undefined,
          tabBarActiveTintColor: WeatherBoardColors.textPrimary,
          tabBarInactiveTintColor: WeatherBoardColors.textMutedGlay,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          tabBarActiveTintColor: WeatherBoardColors.textPrimary,
          tabBarInactiveTintColor: WeatherBoardColors.textMutedGlay,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: '分析',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wand.and.stars" color={color} />,
          tabBarActiveTintColor: WeatherBoardColors.textPrimary,
          tabBarInactiveTintColor: WeatherBoardColors.textMutedGlay,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          tabBarActiveTintColor: WeatherBoardColors.textPrimary,
          tabBarInactiveTintColor: WeatherBoardColors.textMutedGlay,
        }}
      />
    </Tabs>
  );
}
