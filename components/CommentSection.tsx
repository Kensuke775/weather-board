import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import ReportBlockMenu from '@/components/ReportBlockMenu';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CommentItem, CommentSectionProps, REACTION_TYPES, ReactionType, WEATHER_CONFIG, WeatherType } from '@/lib/types';

const fetchCommenterWeathers = async (userIds: string[], roomId: string, setter: (map: Record<string, WeatherType>) => void) => {
  if (userIds.length === 0) return;
  const { data, error } = await supabase.from('weather_logs').select('user_id, weather, updated_at').in('user_id', userIds).eq('room_id', roomId).order('updated_at', { ascending: false });
  if (error) {
    console.error('[CommentSection] fetchCommenterWeathers', error.message);
    return;
  }
  const map: Record<string, WeatherType> = {};
  for (const row of data) {
    if (!(row.user_id in map)) map[row.user_id] = row.weather;
  }
  setter(map);
};

type CommentReactionRow = {
  comment_id: string;
  from_user_id: string;
  reaction_type: ReactionType;
};

const fetchCommentReactions = async (weatherLogId: string, setter: (rows: CommentReactionRow[]) => void) => {
  const { data, error } = await supabase
    .from('comment_reactions')
    .select('comment_id, from_user_id, reaction_type, comments!inner(weather_log_id)')
    .eq('comments.weather_log_id', weatherLogId);
  if (error) {
    console.error('[CommentSection] fetchCommentReactions', error.message);
    return;
  }
  setter(data.map(({ comment_id, from_user_id, reaction_type }) => ({ comment_id, from_user_id, reaction_type })));
};

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
  const [commentReactions, setCommentReactions] = useState<CommentReactionRow[]>([]);
  const [pendingCommentReactions, setPendingCommentReactions] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [commenterWeathers, setCommenterWeathers] = useState<Record<string, WeatherType>>({});
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!currentRoomId) return;
    const userIds = Array.from(new Set(comments.map((comment) => comment.user_id)));
    fetchCommenterWeathers(userIds, currentRoomId, setCommenterWeathers);
  }, [comments, currentRoomId]);

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    if (sortOrder === 'oldest') sorted.reverse();
    return sorted;
  }, [comments, sortOrder]);

  const handlePressSort = () => {
    Alert.alert('並び替え', '', [
      { text: '新しい順', onPress: () => setSortOrder('newest') },
      { text: '古い順', onPress: () => setSortOrder('oldest') },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

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

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `comment-reactions-${weather_log_id}`;
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await fetchCommentReactions(weather_log_id, setCommentReactions);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_reactions' }, async () => {
          await fetchCommentReactions(weather_log_id, setCommentReactions);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [weather_log_id]);

  const handleToggleCommentReaction = async (commentId: string, type: ReactionType) => {
    if (!userId) return;
    const key = `${commentId}:${type}`;
    if (pendingCommentReactions.has(key)) return;
    setPendingCommentReactions((prev) => new Set(prev).add(key));
    try {
      const myExisting = commentReactions.find((row) => row.comment_id === commentId && row.from_user_id === userId);
      if (myExisting?.reaction_type === type) {
        const { error } = await supabase.from('comment_reactions').delete().eq('from_user_id', userId).eq('comment_id', commentId);
        if (error) console.error('[CommentSection] handleToggleCommentReaction(delete)', error.message);
      } else if (myExisting) {
        const { error } = await supabase.from('comment_reactions').update({ reaction_type: type }).eq('from_user_id', userId).eq('comment_id', commentId);
        if (error) console.error('[CommentSection] handleToggleCommentReaction(update)', error.message);
      } else {
        const { error } = await supabase.from('comment_reactions').insert({ from_user_id: userId, comment_id: commentId, reaction_type: type });
        if (error && error.code !== '23505') console.error('[CommentSection] handleToggleCommentReaction(insert)', error.message);
      }
      await fetchCommentReactions(weather_log_id, setCommentReactions);
    } finally {
      setPendingCommentReactions((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

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
      {/* コメント件数ラベル・並び替え */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY_BROWN }}>
          コメント（{comments.length}件）
        </Text>
        <Pressable
          onPress={handlePressSort}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: 100,
            paddingHorizontal: 10,
            paddingVertical: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 1,
          }}>
          <Text style={{ fontSize: 12, color: MUTED_BROWN }}>{sortOrder === 'newest' ? '新しい順' : '古い順'}</Text>
          <Ionicons name="chevron-down" size={12} color={MUTED_BROWN} />
        </Pressable>
      </View>

      <View style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <FlatList
          data={sortedComments}
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
                  {commenterWeathers[item.user_id] && <Text style={{ fontSize: 13 }}>{WEATHER_CONFIG[commenterWeathers[item.user_id]].emoji}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {REACTION_TYPES.map(({ type, emoji }) => {
                    const rowsForType = commentReactions.filter((row) => row.comment_id === item.id && row.reaction_type === type);
                    const isSelected = rowsForType.some((row) => row.from_user_id === userId);
                    const key = `${item.id}:${type}`;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => handleToggleCommentReaction(item.id, type)}
                        disabled={pendingCommentReactions.has(key)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: isSelected ? 'rgba(98,66,33,0.14)' : 'rgba(98,66,33,0.06)',
                          borderRadius: 100,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          opacity: pendingCommentReactions.has(key) ? 0.5 : 1,
                        }}>
                        <Text style={{ fontSize: 11 }}>{emoji}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: PRIMARY_BROWN }}>{rowsForType.length}</Text>
                      </Pressable>
                    );
                  })}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 10 }}>
          <View
            style={{
              flex: 1,
              height: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              paddingHorizontal: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}>
            <Ionicons name="pencil-outline" size={16} color={MUTED_BROWN} />
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              autoCapitalize="none"
              placeholder="コメントを書いてみましょう..."
              placeholderTextColor={MUTED_BROWN}
              style={{ flex: 1, fontSize: 14, color: PRIMARY_BROWN }}
            />
          </View>
          <Pressable
            onPress={handleSendComment}
            style={{
              height: 48,
              justifyContent: 'center',
              backgroundColor: PRIMARY_BROWN,
              borderRadius: 24,
              paddingHorizontal: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'white' }}>送信</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
