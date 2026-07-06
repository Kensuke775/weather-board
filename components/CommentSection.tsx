import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import ReportBlockMenu from '@/components/ReportBlockMenu';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CommentItem, CommentSectionProps } from '@/lib/types';

const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

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

export default function CommentSection({ weather_log_id, to_user_id, readOnly, cardColor = '#EDE0CC' }: CommentSectionProps) {
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
    <View style={{ flex: 1 }}>
      {/* コメント件数ラベル */}
      <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY_BROWN, marginBottom: 10 }}>
        コメント（{comments.length}件）
      </Text>

      <View style={{
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.88)',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(98,66,33,0.08)', marginHorizontal: 16 }} />}
          contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
          style={{ flex: 1 }}
          ref={flatListRef}
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: hexToRgba(cardColor, 0.35),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 28 }}>🌱</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY_BROWN, marginBottom: 6 }}>
                  コメントはまだありません
                </Text>
                <Text style={{ fontSize: 12, color: MUTED_BROWN }}>
                  最初のコメントを送ってみましょう！
                </Text>
              </View>
            ) : null
          }
          onContentSizeChange={() => flatListRef?.current?.scrollToOffset({ offset: 0, animated: true })}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: hexToRgba(cardColor, 0.3),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 16 }}>{item.profiles.avatar_emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY_BROWN }}>
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
                    <Ionicons name="trash-outline" size={16} color={MUTED_BROWN} />
                  </Pressable>
                ) : (
                  <ReportBlockMenu targetUserId={item.user_id} weatherLogId={weather_log_id} commentId={item.id} variant="compact" />
                )}
              </View>
              <Text style={{ fontSize: 13, color: 'rgba(98,66,33,0.85)', paddingLeft: 40 }}>
                {item.body}
              </Text>
              <Text style={{ fontSize: 10, color: MUTED_BROWN, textAlign: 'right', marginTop: 4 }}>
                {new Date(item.created_at).toLocaleTimeString('jp-JP', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        />
      </View>

      {!readOnly && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          marginBottom: 8,
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
            placeholder="コメントを書いてみましょう..."
            placeholderTextColor={MUTED_BROWN}
            style={{ flex: 1, fontSize: 14, color: PRIMARY_BROWN, paddingVertical: 6 }}
          />
          <Pressable
            onPress={handleSendComment}
            style={{
              backgroundColor: PRIMARY_BROWN,
              borderRadius: 14,
              paddingHorizontal: 18,
              paddingVertical: 8,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'white' }}>送信</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
