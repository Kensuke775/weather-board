import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/notifications.png');
const PRIMARY_BROWN = '#624221';
const SECONDARY_BROWN = 'rgba(98,66,33,0.75)';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';

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
  const { bottom, top } = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'android' ? 72 : 60 + bottom + 4;
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
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <FlatList
        data={dataNotifications.filter((item) => item.profiles !== null)}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View style={{ paddingTop: top + 20, alignItems: 'center', marginBottom: 8, paddingHorizontal: 20 }}>
            <Ionicons name="mail-open-outline" size={56} color={PRIMARY_BROWN} />
            <Text
              style={{
                fontFamily: 'DancingScript_400Regular',
                fontSize: 36,
                color: PRIMARY_BROWN,
                marginTop: 4,
                marginBottom: 16,
              }}>
              Mail Box
            </Text>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.88)',
                borderRadius: 14,
                padding: 16,
                width: '100%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}>
              <Text style={{ color: PRIMARY_BROWN, textAlign: 'center', lineHeight: 22, fontSize: 13 }}>
                あなた宛に届いたコメントやお知らせをここで確認できます。
              </Text>
              <Text style={{ textAlign: 'right', fontSize: 14, marginTop: 6 }}>🌿</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', textAlign: 'center', padding: 20 }}>まだ通知がありません。</Text>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabBarHeight + 16 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 14,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Text style={{ fontSize: 32 }}>{item.profiles?.avatar_emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 14 }}>
                    {item.profiles?.nickname} から
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={MUTED_BROWN} />
                </View>
                <Text style={{ color: SECONDARY_BROWN, fontSize: 12, marginTop: 4 }}>
                  {item.type === 'comment' ? 'コメントが届きました。' : '「少し話したいです」が届きました。'}
                </Text>
                <Text style={{ color: MUTED_BROWN, fontSize: 11, textAlign: 'right', marginTop: 8 }}>
                  {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            {!item.is_read && (
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: 'white', fontSize: 8, fontWeight: '700' }}>new</Text>
              </View>
            )}
          </View>
        )}
      />
    </ImageBackground>
  );
}
