import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';
import { useFonts } from 'expo-font';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, Text, View } from 'react-native';

const backgroundImage = require('@/assets/images/weather/notifications.png');

const fetchNotifications = async (userId: string, setter: (data: Notification[]) => void) => {
  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notifications')
    .select('*, profiles!from_user_id(nickname, avatar_emoji)')
    .eq('to_user_id', userId)
    .neq('from_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (notificationsError) {
    console.error('[notifications] fetchNotifications', notificationsError.message);
    Alert.alert('通知取得に失敗しました。');
    return;
  }
  setter(notificationsData);
};

const fetchIsRead = async (userId: string) => {
  const { error: isReadError } = await supabase.from('notifications').update({ is_read: true }).eq('to_user_id', userId).eq('is_read', false);
  if (isReadError) {
    console.error('[notifications] fetchIsRead', isReadError.message);
    Alert.alert('通知取得に失敗しました。');
    return;
  }
};

export default function Notifications() {
  const { user } = useUser();
  const userId = user?.id;
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
  const [dataNotifications, setDataNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `notifications-list-${userId}`;
      const existing = supabase.getChannels().find((ch) => ch.subTopic === channelName);
      if (existing) supabase.removeChannel(existing);
      await fetchNotifications(userId, setDataNotifications);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
          await fetchNotifications(userId, setDataNotifications);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchIsRead(userId);
    }, [userId]),
  );

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={backgroundImage} className="flex-1 pt-40 pb-40 gap-10 overflow-visible">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
        Mail Box
      </Text>
      <FlatList
        data={dataNotifications.filter((item) => item.profiles !== null)}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className="h-4" />}
        ListEmptyComponent={() => (
          <Text className="text-base font-bold text-center" style={{ color: WeatherBoardColors.textPrimary }}>
            まだ通知がありません。
          </Text>
        )}
        contentContainerStyle={{ paddingTop: 16, marginBottom: 16, paddingRight: 20, paddingLeft: 20, overflow: 'visible', flexGrow: 1 }}
        renderItem={({ item }) => (
          <View className="relative overflow-visible">
            <View className="p-4 border" style={{ borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
              <View className="flex flex-row items-center gap-1 mb-2">
                <Text className="text-xl">{item.profiles?.avatar_emoji}</Text>
                <Text className="text-sm font-semibold" style={{ color: 'black' }}>
                  {item.profiles?.nickname} から
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-1 mb-2">
                <Text className="text-sm font-semibold" style={{ color: 'black' }}>
                  {item.type === 'comment' ? 'コメントが届きました。' : '「少し話したいです」が届きました。'}
                </Text>
              </View>
            </View>
            <Text className="text-sm font-semibold text-right flex-1" style={{ color: WeatherBoardColors.textMuted }}>
              {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.is_read ? null : (
              <View className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex justify-center items-center border" style={{ borderColor: WeatherBoardColors.glassBorder }}>
                <Text className="text-white text-[7px] font-bold">new</Text>
              </View>
            )}
          </View>
        )}
      />
    </ImageBackground>
  );
}
