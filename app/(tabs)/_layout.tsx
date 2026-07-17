import React, { ComponentProps, useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const backgroundImage = require('@/assets/images/weather/new-index-bg.png');

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

type TabIconProps = {
  name: ComponentProps<typeof IconSymbol>['name'];
  color: string;
  focused: boolean;
};

const TabIcon = ({ name, color, focused }: TabIconProps) => {
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      {focused && <View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 30, backgroundColor: 'rgba(96, 165, 250, 0.10)', transform: [{ translateY: 4 }] }} />}
      <IconSymbol size={28} name={name} color={color} />
    </View>
  );
};

export default function TabLayout() {
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
        tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
        tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          position: 'absolute',
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'android' ? 4 : Math.max(bottom - 4, 0),
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
          tabBarIcon: ({ color, focused }) => <TabIcon name="house.fill" color={color} focused={focused} />,
          tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'ポスト',
          tabBarIcon: ({ color, focused }) => <TabIcon name="square.and.pencil" color={color} focused={focused} />,
          tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color, focused }) => <TabIcon name="bell.fill" color={color} focused={focused} />,
          tabBarBadge: unreadCount ? unreadCount : undefined,
          tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" color={color} focused={focused} />,
          tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: '分析',
          tabBarIcon: ({ color, focused }) => <TabIcon name="wand.and.stars" color={color} focused={focused} />,
          tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, focused }) => <TabIcon name="gearshape.fill" color={color} focused={focused} />,
          tabBarActiveTintColor: WeatherBoardColors.buttonBackground,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        }}
      />
    </Tabs>
  );
}
