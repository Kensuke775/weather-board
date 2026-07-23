import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';

import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { REACTION_TYPES, ReactionType } from '@/lib/types';

// バッジ・タップ判定用の軽量な行（profilesは含まない）
type ReactionRow = {
  from_user_id: string;
  reaction_type: ReactionType;
};

// ボトムシートの反応者一覧用（開いた時だけ取得する）
type ReactionDetailRow = {
  from_user_id: string;
  reaction_type: ReactionType;
  profiles: { nickname: string; avatar_emoji: string } | { nickname: string; avatar_emoji: string }[];
};

type PostReactionBarProps = {
  weatherLogId: string;
  toUserId: string;
};

const fetchReactions = async (weatherLogId: string, setter: (rows: ReactionRow[]) => void) => {
  const { data, error } = await supabase.from('post_reactions').select('from_user_id, reaction_type').eq('weather_log_id', weatherLogId);
  if (error) {
    console.error('[PostReactionBar] fetchReactions', error.message);
    return;
  }
  setter(data);
};

const fetchReactionDetails = async (weatherLogId: string, setter: (rows: ReactionDetailRow[]) => void, loadingSetter: (loading: boolean) => void) => {
  loadingSetter(true);
  const { data, error } = await supabase.from('post_reactions').select('from_user_id, reaction_type, profiles(nickname, avatar_emoji)').eq('weather_log_id', weatherLogId);
  if (error) {
    console.error('[PostReactionBar] fetchReactionDetails', error.message);
    loadingSetter(false);
    return;
  }
  setter(data);
  loadingSetter(false);
};

export default function PostReactionBar({ weatherLogId, toUserId }: PostReactionBarProps) {
  const { user } = useUser();
  const userId = user?.id;
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [pendingTypes, setPendingTypes] = useState<Set<ReactionType>>(new Set());
  const [reactionDetails, setReactionDetails] = useState<ReactionDetailRow[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const channelName = `post-reactions-${weatherLogId}`;
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await fetchReactions(weatherLogId, setReactions);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, async () => {
          await fetchReactions(weatherLogId, setReactions);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [weatherLogId]);

  // reactions を1回のループで走査し、自分のリアクション種別とタイプ別カウントを同時に確定する。
  // 従来は .find() × 1 + .filter() × REACTION_TYPES.length の複数スキャンだった。
  const { myReactionType, countsByReactionType } = useMemo(() => {
    let myType: ReactionType | null = null;
    const counts = new Map<ReactionType, number>();
    for (const row of reactions) {
      if (row.from_user_id === userId) myType = row.reaction_type;
      counts.set(row.reaction_type, (counts.get(row.reaction_type) ?? 0) + 1);
    }
    return { myReactionType: myType, countsByReactionType: counts };
  }, [reactions, userId]);

  const summaries = useMemo(
    () =>
      REACTION_TYPES.map(({ type, emoji }) => ({
        type,
        emoji,
        count: countsByReactionType.get(type) ?? 0,
        isSelected: myReactionType === type,
      })),
    [countsByReactionType, myReactionType],
  );

  const totalReactorCount = useMemo(() => new Set(reactions.map((row) => row.from_user_id)).size, [reactions]);

  const reactorListData = useMemo(
    () => REACTION_TYPES.flatMap(({ type, emoji }) => reactionDetails.filter((row) => row.reaction_type === type).map((row) => ({ ...row, emoji }))),
    [reactionDetails],
  );

  const handleToggleReaction = async (type: ReactionType) => {
    if (!userId || pendingTypes.has(type)) return;
    setPendingTypes((prev) => new Set(prev).add(type));
    try {
      if (myReactionType === type) {
        // 同じ種類を押した → 解除
        const { error } = await supabase.from('post_reactions').delete().eq('from_user_id', userId).eq('weather_log_id', weatherLogId);
        if (error) console.error('[PostReactionBar] handleToggleReaction(delete)', error.message);
      } else if (myReactionType) {
        // 別の種類を押した → 切り替え
        const { error } = await supabase.from('post_reactions').update({ reaction_type: type }).eq('from_user_id', userId).eq('weather_log_id', weatherLogId);
        if (error) console.error('[PostReactionBar] handleToggleReaction(update)', error.message);
      } else {
        // まだ反応していない → 新規追加
        const { error } = await supabase.from('post_reactions').insert({ from_user_id: userId, weather_log_id: weatherLogId, reaction_type: type });
        if (error && error.code !== '23505') {
          console.error('[PostReactionBar] handleToggleReaction(insert)', error.message);
        } else if (!error && userId !== toUserId) {
          const { error: notifyError } = await supabase.from('notifications').insert({
            to_user_id: toUserId,
            from_user_id: userId,
            type: 'reaction',
            weather_log_id: weatherLogId,
            is_read: false,
          });
          if (notifyError) console.error('[PostReactionBar] handleToggleReaction notify', notifyError.message);
        }
      }
      await fetchReactions(weatherLogId, setReactions);
    } finally {
      setPendingTypes((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }
  };

  const handleOpenReactorList = () => {
    bottomSheetRef.current?.present();
    fetchReactionDetails(weatherLogId, setReactionDetails, setIsLoadingDetails);
  };

  return (
    <View
      style={{
        ...CardStyle,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
      }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {summaries.map(({ type, emoji, count, isSelected }) => (
          <Pressable
            key={type}
            onPress={() => handleToggleReaction(type)}
            disabled={pendingTypes.has(type)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: isSelected ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: 100,
              paddingHorizontal: 10,
              paddingVertical: 6,
              opacity: pendingTypes.has(type) ? 0.5 : 1,
            }}>
            <Text style={{ fontSize: 14 }}>{emoji}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{count}</Text>
          </Pressable>
        ))}
      </View>

      {totalReactorCount > 0 && (
        <Pressable onPress={handleOpenReactorList} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedDark }}>{totalReactorCount}人がリアクション</Text>
          <Ionicons name="chevron-forward" size={12} color={WeatherBoardColors.textMutedDark} />
        </Pressable>
      )}

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['50%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: WeatherBoardColors.textMutedDark }}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}>
        {isLoadingDetails ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={WeatherBoardColors.textPrimaryDark} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={reactorListData}
            keyExtractor={(item, index) => `${item.from_user_id}-${item.reaction_type}-${index}`}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />}
            renderItem={({ item }) => {
              const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 20 }}>{profile.avatar_emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: WeatherBoardColors.textPrimaryDark, fontWeight: '600' }}>{profile.nickname}</Text>
                  <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                </View>
              );
            }}
          />
        )}
      </BottomSheetModal>
    </View>
  );
}
