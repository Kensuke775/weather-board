import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, Text, View } from 'react-native';

const backgroundImage = require('@/assets/images/weather/notifications.png');

const fetchNotifications = async (setter: (data: Notification[]) => void) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notifications')
    .select('*, profiles!from_user_id(nickname, avatar_emoji)')
    .eq('to_user_id', user.id)
    .neq('from_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (notificationsError) return Alert.alert(notificationsError.message);

  setter(notificationsData);
};

const fetchIsRead = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
  const { error: isReadError } = await supabase.from('notifications').update({ is_read: true }).eq('to_user_id', user.id).eq('is_read', false);
  if (isReadError) return Alert.alert(isReadError.message);
};

export default function Notifications() {
  const [dataNotifications, setDataNotifications] = useState<Notification[]>([]);
  useEffect(() => {
    const initialize = async () => {
      await fetchNotifications(setDataNotifications);
    };

    initialize();
    const channel = supabase
      .channel('notifications-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        await fetchNotifications(setDataNotifications);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIsRead();
    }, []),
  );

  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  if (!fontsLoaded) return null;
  return (
    <ImageBackground source={backgroundImage} className="flex-1 pt-40 gap-10 px-10">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
        Mail Box
      </Text>
      <FlatList
        data={dataNotifications}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <BlurView intensity={40} tint="light" className="p-4 border" style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: WeatherBoardColors.glassBackground, opacity: item.is_read ? 1 : 0.3 }}>
            <View className="flex flex-row items-center gap-1 mb-2">
              <Text className="text-xl">{item.profiles?.avatar_emoji}</Text>
              <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                {item.profiles?.nickname} から
              </Text>
            </View>
            <View className="flex-row items-center justify-between gap-1 mb-2">
              <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                {item.type === 'comment' ? 'コメントが届きました。' : '「少し話したいです」が届きました。'}
              </Text>
              <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </BlurView>
        )}
      />
    </ImageBackground>
  );
}
