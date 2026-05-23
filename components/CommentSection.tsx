import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { supabase } from '@/lib/supabase';
import { CommentItem } from '@/lib/types';
import { BlurView } from 'expo-blur';

type CommentSectionProps = {
  weather_log_id: string;
  to_user_id: string;
};

export default function CommentSection({ weather_log_id, to_user_id }: CommentSectionProps) {
  const [inputText, setInputText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const { currentRoomId } = useRoom();

  useEffect(() => {
    const fetchComments = async () => {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, weather_log_id, user_id, body, created_at, profiles(nickname, avatar_emoji)')
        .eq('weather_log_id', weather_log_id)
        .order('created_at', { ascending: false });
      if (commentsError) return Alert.alert(commentsError.message);
      const formattedData = commentsData.map((log) => ({ ...log, profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles }));
      setComments(formattedData);
    };
    fetchComments();
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weather_log_id]);
  const handleSendComment = async () => {
    if (inputText === '') return Alert.alert('入力欄が空です。');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');

    const { error: commentError } = await supabase.from('comments').insert({ weather_log_id, user_id: user.id, body: inputText });
    if (commentError) return Alert.alert(commentError.message);

    if (user.id !== to_user_id) {
      const { error: notificationError } = await supabase.from('notifications').insert({ type: 'comment', to_user_id, weather_log_id, from_user_id: user.id, room_id: currentRoomId, is_read: false });
      if (notificationError) Alert.alert(notificationError.message);
    }
    setInputText('');
  };

  return (
    <View className="flex-1">
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
        style={{ flex: 1 }}
        ref={flatListRef}
        onContentSizeChange={() => flatListRef?.current?.scrollToOffset({ offset: 0, animated: true })}
        renderItem={({ item }) => (
          <View key={item.id}>
            <BlurView className="p-4" intensity={40} tint="light" style={{ borderRadius: 16, overflow: 'hidden', borderColor: WeatherBoardColors.glassBorder, borderWidth: 1, backgroundColor: WeatherBoardColors.glassBackground }}>
              <View className="flex flex-row items-center pb-2 mb-4 gap-2" style={{ borderBottomWidth: 1, borderBottomColor: WeatherBoardColors.glassBorder }}>
                <Text className="text-lg">{item.profiles.avatar_emoji}</Text>
                <Text className="text-ms font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                  {item.profiles.nickname}
                </Text>
              </View>
              <View className="p-2">
                <Text className="text-ms" style={{ color: WeatherBoardColors.textPrimary }}>
                  {item.body}
                </Text>
              </View>
            </BlurView>
            <View className="flex-row justify-end">
              <Text className="text-sm" style={{ color: WeatherBoardColors.textMuted }}>
                {new Date(item.created_at).toLocaleTimeString('jp-JP', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />

      <BlurView
        intensity={40}
        tint="light"
        className="flex-row justify-between items-center w-full mb-12"
        style={{ borderRadius: 16, overflow: 'hidden', borderColor: WeatherBoardColors.glassBorder, borderWidth: 1, backgroundColor: WeatherBoardColors.glassBackground }}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          autoCapitalize="none"
          placeholder="コメントできます。"
          className="py-4 px-4 mr-2"
          placeholderTextColor={WeatherBoardColors.textPrimary}
          style={{ color: WeatherBoardColors.textPrimary, flex: 1 }}
        />
        <Pressable onPress={handleSendComment} className="py-4 px-4 flex justify-center" style={{ backgroundColor: WeatherBoardColors.accentBackground }}>
          <Text className="text-base font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
            送信する
          </Text>
        </Pressable>
      </BlurView>
    </View>
  );
}
