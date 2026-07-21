import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvatarWeatherBadge from '@/components/AvatarWeatherBadge';
import ReportBlockMenu from '@/components/ReportBlockMenu';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CommentItem, CommentSectionProps, REACTION_TYPES, ReactionType, WeatherType } from '@/lib/types';

const fetchCommenterWeathers = async (userIds: string[], setter: (map: Record<string, WeatherType>) => void) => {
  if (userIds.length === 0) return;
  const { data, error } = await supabase.from('weather_logs').select('user_id, weather, updated_at').in('user_id', userIds).order('updated_at', { ascending: false });
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
  const { bottom } = useSafeAreaInsets();
  const { user } = useUser();
  const userId = user?.id;
  const router = useRouter();
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
    const userIds = Array.from(new Set(comments.map((comment) => comment.user_id)));
    fetchCommenterWeathers(userIds, setCommenterWeathers);
  }, [comments]);

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
        if (error && error.code !== '23505') {
          console.error('[CommentSection] handleToggleCommentReaction(insert)', error.message);
        } else if (!error) {
          const commentAuthorId = comments.find((c) => c.id === commentId)?.user_id;
          if (commentAuthorId && commentAuthorId !== userId) {
            const { error: notifyError } = await supabase.from('notifications').insert({
              to_user_id: commentAuthorId,
              from_user_id: userId,
              type: 'reaction',
              weather_log_id,
              is_read: false,
            });
            if (notifyError) console.error('[CommentSection] handleToggleCommentReaction notify', notifyError.message);
          }
        }
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
        const { error: notificationError } = await supabase.from('notifications').insert({ type: 'comment', to_user_id, weather_log_id, from_user_id: userId, is_read: false });
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
        <Text style={{ fontSize: 14, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
          コメント（{comments.length}件）
        </Text>
        <Pressable
          onPress={handlePressSort}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            ...CardStyle,
            borderRadius: 100,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
          <Text style={{ fontSize: 12, color: WeatherBoardColors.textMutedDark }}>{sortOrder === 'newest' ? '新しい順' : '古い順'}</Text>
          <Ionicons name="chevron-down" size={12} color={WeatherBoardColors.textMutedDark} />
        </Pressable>
      </View>

      <View style={{ ...CardStyle, flex: 1, borderRadius: 20, overflow: 'hidden' }}>
        <FlatList
          data={sortedComments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 16 }} />}
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
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 28 }}>🌱</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, marginBottom: 6 }}>
                  コメントはまだありません
                </Text>
                <Text style={{ fontSize: 12, color: WeatherBoardColors.textMutedDark }}>
                  最初のコメントを送ってみましょう！
                </Text>
              </View>
            ) : null
          }
          onContentSizeChange={() => flatListRef?.current?.scrollToOffset({ offset: 0, animated: true })}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Pressable
                  onPress={() => router.push(`/user-profile?userId=${item.user_id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AvatarWeatherBadge
                    avatarEmoji={item.profiles.avatar_emoji}
                    weather={commenterWeathers[item.user_id] ?? 'cloudy'}
                    size={28}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.textPrimaryDark }}>
                    {item.profiles.nickname}
                  </Text>
                </Pressable>
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
                          backgroundColor: isSelected ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)',
                          borderRadius: 100,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          opacity: pendingCommentReactions.has(key) ? 0.5 : 1,
                        }}>
                        <Text style={{ fontSize: 11 }}>{emoji}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{rowsForType.length}</Text>
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
                      <Ionicons name="trash-outline" size={16} color={WeatherBoardColors.textMutedDark} />
                    </Pressable>
                  ) : (
                    <ReportBlockMenu targetUserId={item.user_id} weatherLogId={weather_log_id} commentId={item.id} variant="compact" />
                  )}
                </View>
              </View>
              <Text style={{ fontSize: 13, color: WeatherBoardColors.textPrimaryDark, paddingLeft: 40 }}>
                {item.body}
              </Text>
              <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedDark, textAlign: 'right', marginTop: 4 }}>
                {new Date(item.created_at).toLocaleTimeString('jp-JP', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        />
      </View>

      {!readOnly && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: Math.max(bottom, 10) }}>
          <View
            style={{
              ...CardStyle,
              flex: 1,
              height: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: 24,
              paddingHorizontal: 16,
            }}>
            <Ionicons name="pencil-outline" size={16} color={WeatherBoardColors.textMutedDark} />
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              autoCapitalize="none"
              placeholder="コメントを書いてみましょう..."
              placeholderTextColor={WeatherBoardColors.textMutedDark}
              style={{ flex: 1, fontSize: 14, color: WeatherBoardColors.textPrimaryDark }}
            />
          </View>
          <Pressable
            onPress={handleSendComment}
            style={{
              height: 48,
              justifyContent: 'center',
              backgroundColor: WeatherBoardColors.buttonBackground,
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
