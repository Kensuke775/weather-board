import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';

const fetchNotifications = async (setter: (data: Notification[]) => void) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
  const { data: notificationsData, error: notificationsError } = await supabase.from('notifications').select('*, profiles!from_user_id(nickname, avatar_emoji)').eq('to_user_id', user.id);
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
  return (
    <View className="flex justify-center w-full h-full">
      <View>
        <Text>リスト</Text>
        <FlatList
          data={dataNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <Text>{item.profiles?.avatar_emoji}</Text>
              <Text>{item.profiles?.nickname}</Text>
              <Text>{item.type}</Text>
              <Text>{new Date(item.created_at).toLocaleString('ja-JP')}</Text>
              <Text>{item.is_read ? '既読' : '未読'}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}
