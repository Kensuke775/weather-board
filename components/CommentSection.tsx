import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import ReportBlockMenu from '@/components/ReportBlockMenu';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CommentItem, CommentSectionProps } from '@/lib/types';

const fetchComments = async (weatherLogId: string, setter: (data: CommentItem[]) => void, loadingSetter: (loading: boolean) => void) => {
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('id, weather_log_id, user_id, body, created_at, profiles(nickname, avatar_emoji)')
    .eq('weather_log_id', weatherLogId)
    .order('created_at', { ascending: false });
  if (commentsError) {
    console.error('[CommentSection] fetchComments', commentsError.message);
    Alert.alert('コメントの取得に失敗しました。');
    return;
  }
  const formattedData = commentsData.map((log) => ({ ...log, profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles }));
  setter(formattedData);
  loadingSetter(false);
};

export default function CommentSection({ weather_log_id, to_user_id, readOnly }: CommentSectionProps) {
  const { currentRoomId } = useRoom();
  const { user } = useUser();
  const userId = user?.id;
  const [inputText, setInputText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComenting, setIsCommenting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `comments-${weather_log_id}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await fetchComments(weather_log_id, setComments, setIsLoading);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
          await fetchComments(weather_log_id, setComments, setIsLoading);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [weather_log_id]);

  const handleSendComment = async () => {
    if (isComenting) return;
    setIsCommenting(true);
    try {
      if (inputText === '') return Alert.alert('入力欄が空です。');
      const { error: commentError } = await supabase.from('comments').insert({ weather_log_id, user_id: userId, body: inputText });
      if (commentError) {
        console.error('[CommentSection] handleSendComment', commentError.message);
        Alert.alert('コメントの書き込みに失敗しました。');
        return;
      }
      if (userId !== to_user_id) {
        const { error: notificationError } = await supabase.from('notifications').insert({ type: 'comment', to_user_id, weather_log_id, from_user_id: userId, room_id: currentRoomId, is_read: false });
        if (notificationError) {
          console.error('[CommentSection] handleSendComment', notificationError.message);
          Alert.alert('コメントの書き込みに失敗しました。');
          return;
        }
      }
      setInputText('');
      Keyboard.dismiss();
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      console.error('[CommentSection] handleDeleteComment', error.message);
      Alert.alert('コメントの削除に失敗しました。');
      return;
    }
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
        ListEmptyComponent={
          !isLoading ? (
            <Text className="text-base" style={{ color: WeatherBoardColors.textMuted }}>
              コメントがありません。
            </Text>
          ) : null
        }
        onContentSizeChange={() => flatListRef?.current?.scrollToOffset({ offset: 0, animated: true })}
        renderItem={({ item }) => (
          <View key={item.id}>
            <BlurView className="p-4" intensity={40} tint="light" style={{ borderRadius: 16, overflow: 'hidden', borderColor: WeatherBoardColors.glassBorder, borderWidth: 1, backgroundColor: WeatherBoardColors.glassBackground }}>
              <View className="flex flex-row items-center justify-between pb-2 mb-4 gap-2" style={{ borderBottomWidth: 1, borderBottomColor: WeatherBoardColors.glassBorder }}>
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg">{item.profiles.avatar_emoji}</Text>
                  <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                    {item.profiles.nickname}
                  </Text>
                </View>
                {item.user_id === userId ? (
                  <Pressable
                    onPress={() => {
                      Alert.alert('確認', 'このコメントを削除しますか？\n削除すると元に戻せません。', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除する', style: 'destructive', onPress: () => handleDeleteComment(item.id) },
                      ]);
                    }}>
                    <Ionicons name="trash-outline" size={16} style={{ color: WeatherBoardColors.textPrimary }} />
                  </Pressable>
                ) : (
                  <ReportBlockMenu targetUserId={item.user_id} weatherLogId={weather_log_id} commentId={item.id} variant="compact" />
                )}
              </View>
              <View className="p-2">
                <Text className="text-sm" style={{ color: WeatherBoardColors.textPrimary }}>
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

      {!readOnly && (
        <BlurView
          intensity={40}
          tint="light"
          className="flex-row justify-between items-center w-full mb-12 mt-4 h-14"
          style={{ flexShrink: 0, borderRadius: 16, overflow: 'hidden', borderColor: WeatherBoardColors.glassBorder, borderWidth: 1, backgroundColor: WeatherBoardColors.glassBackground }}>
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
      )}
    </View>
  );
}
