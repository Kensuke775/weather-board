import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import RoomChatFloatingButton from '@/components/RoomChatFloatingButton';
import WeatherBoard from '@/components/WeatherBoard';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CommentsStatus, WEATHER_CONFIG, WeatherBoardItem, WeatherType } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');

const FEED_PAGE_SIZE = 20;

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

type FeedFilters = {
  weather: WeatherType | null;
  tag: string;
  prefecture: string | null;
  followingOnly: boolean;
  followedUserIds: string[];
};
const DEFAULT_FILTERS: FeedFilters = {
  weather: null,
  tag: '',
  prefecture: null,
  followingOnly: false,
  followedUserIds: [],
};

const WEATHER_FILTER_OPTIONS: { label: string; value: WeatherType | null }[] = [
  { label: 'All', value: null },
  ...Object.entries(WEATHER_CONFIG).map(([key, cfg]) => ({ label: cfg.emoji, value: key as WeatherType })),
];

const fetchTodaySummary = async (setter: (data: Record<string, number>) => void) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('weather_logs')
    .select('weather')
    .eq('logged_date', today);
  if (error) {
    console.error('[index(tab)] fetchTodaySummary', error.message);
    return;
  }
  const counts = (data ?? []).reduce(
    (acc, { weather }) => {
      acc[weather] = (acc[weather] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  setter(counts);
};

const fetchReactionsData = async (setter: (data: Record<string, number>) => void) => {
  const { data: reactionsData, error: reactionsError } = await supabase.from('post_reactions').select('weather_log_id, from_user_id');
  if (reactionsError) {
    console.error('[index(tab)] fetchReactionsData', reactionsError.message);
    Alert.alert('リアクションの取得に失敗しました。');
    return;
  }
  const reactorSets = new Map<string, Set<string>>();
  for (const row of reactionsData) {
    if (!reactorSets.has(row.weather_log_id)) reactorSets.set(row.weather_log_id, new Set());
    reactorSets.get(row.weather_log_id)!.add(row.from_user_id);
  }
  const countMap = Object.fromEntries(Array.from(reactorSets.entries()).map(([logId, users]) => [logId, users.size]));
  setter(countMap);
};

const fetchNotificationsData = async (userId: string, setter: (data: Record<string, number>) => void) => {
  const { data: notificationsData, error: notificationsError } = await supabase.from('notifications').select('weather_log_id').eq('type', 'comment').eq('to_user_id', userId).eq('is_read', false);
  if (notificationsError) {
    console.error('[index(tab)] fetchNotificationsData', notificationsError.message);
    Alert.alert('通知取得に失敗しました。');
    return;
  }
  const unreadCountMap = notificationsData.reduce(
    (acc, notification) => {
      acc[notification.weather_log_id] = (acc[notification.weather_log_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  setter(unreadCountMap);
};

const fetchCommentsData = async (setter: (data: CommentsStatus) => void) => {
  const { data: commentsData, error: commentsError } = await supabase.from('comments').select('weather_log_id, user_id, profiles(avatar_emoji)');
  if (commentsError) {
    console.error('[index(tab)] fetchCommentsData', commentsError.message);
    Alert.alert('コメントの取得に失敗しました。');
    return;
  }

  const intermediate = new Map<string, { users: Map<string, string | undefined>; count: number }>();

  for (const status of commentsData) {
    const profile = Array.isArray(status.profiles) ? status.profiles[0] : status.profiles;
    const avatars = profile?.avatar_emoji;
    if (!intermediate.has(status.weather_log_id)) {
      intermediate.set(status.weather_log_id, { users: new Map(), count: 0 });
    }
    const entry = intermediate.get(status.weather_log_id)!;
    if (!entry.users.has(status.user_id)) {
      entry.users.set(status.user_id, avatars);
    }
    entry.count += 1;
  }

  const commentersMap = Object.fromEntries(
    Array.from(intermediate.entries()).map(([logId, { users, count }]) => [
      logId,
      {
        commenters: Array.from(users.entries()).map(([user_id, emoji]) => ({ user_id, emoji })),
        count,
      },
    ]),
  ) as CommentsStatus;

  setter(commentersMap);
};

const fetchFollowedUserIds = async (userId: string, setter: (ids: Set<string>) => void) => {
  const { data, error } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', userId);
  if (error) {
    console.error('[index(tab)] fetchFollowedUserIds', error.message);
    return;
  }
  setter(new Set((data ?? []).map((row) => row.followed_id)));
};

const fetchFeedPage = async (
  page: number,
  setter: (data: WeatherBoardItem[]) => void,
  loadingSetter: (loading: boolean) => void,
  filters: FeedFilters = DEFAULT_FILTERS,
) => {
  if (filters.followingOnly && filters.followedUserIds.length === 0) {
    setter([]);
    loadingSetter(false);
    return;
  }

  const from = page * FEED_PAGE_SIZE;
  const to = from + FEED_PAGE_SIZE - 1;
  const hasTagFilter = filters.tag.trim().length > 0;
  const hasPrefectureFilter = filters.prefecture !== null;

  const profileSelect = hasPrefectureFilter
    ? 'profiles!inner(nickname, avatar_emoji, prefecture)'
    : 'profiles(nickname, avatar_emoji, prefecture)';
  const selectQuery = hasTagFilter
    ? `id, user_id, weather, note, updated_at, ${profileSelect}, weather_log_activities!inner(activity_tag_id, activity_tags!inner(tag_name))`
    : `id, user_id, weather, note, updated_at, ${profileSelect}, weather_log_activities(activity_tag_id, activity_tags(tag_name))`;

  let query = supabase
    .from('weather_logs')
    .select(selectQuery)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (filters.weather) query = query.eq('weather', filters.weather);
  if (hasTagFilter) query = query.ilike('weather_log_activities.activity_tags.tag_name', `%${filters.tag.trim()}%`);
  if (hasPrefectureFilter) query = query.eq('profiles.prefecture', filters.prefecture);
  if (filters.followingOnly) query = query.in('user_id', filters.followedUserIds);

  const { data: weatherLogsData, error: weatherLogsError } = await query;

  if (weatherLogsError) {
    console.error('[index(tab)] fetchFeedPage', weatherLogsError.message);
    Alert.alert('投稿の取得に失敗しました。');
    return;
  }

  const formattedData = weatherLogsData.map((log) => ({
    ...log,
    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
    tags: log.weather_log_activities
      .filter((tag) => tag.activity_tags !== null)
      .map((tag) => {
        const activityTag = Array.isArray(tag.activity_tags) ? tag.activity_tags[0] : tag.activity_tags;
        return {
          id: tag.activity_tag_id,
          name: activityTag.tag_name,
        };
      }),
    weather_log_activities: undefined,
  }));
  setter(formattedData);
  loadingSetter(false);
};

export default function HomeScreen() {
  const { user } = useUser();
  const userId = user?.id;
  const { currentRoomId, setCurrentRoomId, isLoading: roomIsLoading } = useRoom();
  const [boardData, setBoardData] = useState<WeatherBoardItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [commentStatus, setCommentStatus] = useState<CommentsStatus>({});
  const [reactionStatus, setReactionStatus] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  const [todaySummary, setTodaySummary] = useState<Record<string, number>>({});
  const [weatherFilter, setWeatherFilter] = useState<WeatherType | null>(null);
  const [tagQuery, setTagQuery] = useState('');
  const [debouncedTagQuery, setDebouncedTagQuery] = useState('');
  const [prefectureFilter, setPrefectureFilter] = useState<string | null>(null);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const currentFiltersRef = useRef<FeedFilters>(DEFAULT_FILTERS);
  const isFilterInitialRender = useRef(true);

  // タグ入力をデバウンス
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTagQuery(tagQuery), 400);
    return () => clearTimeout(timer);
  }, [tagQuery]);

  // フィルタ ref を最新状態に同期
  useEffect(() => {
    currentFiltersRef.current = {
      weather: weatherFilter,
      tag: debouncedTagQuery,
      prefecture: prefectureFilter,
      followingOnly,
      followedUserIds: Array.from(followedUserIds),
    };
  }, [weatherFilter, debouncedTagQuery, prefectureFilter, followingOnly, followedUserIds]);

  const loadFeedPage = useCallback(async (pageToLoad: number, append: boolean) => {
    await fetchFeedPage(
      pageToLoad,
      (data) => {
        setBoardData((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === FEED_PAGE_SIZE);
      },
      setIsLoading,
      currentFiltersRef.current,
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const fetchCurrentRoom = async () => {
        const { data: roomData, error: roomError } = await supabase.from('room_members').select('room_id').eq('user_id', userId);
        if (roomError) {
          console.error('[index(tab)] fetchCurrentRoom', roomError.message);
          Alert.alert('ルームの取得に失敗しました。');
          return;
        }
        if (roomData.length === 0) return;
        if (!currentRoomId) setCurrentRoomId(roomData[0]?.room_id);
      };
      fetchCurrentRoom();
    }, [setCurrentRoomId, userId, currentRoomId]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setPage(0);
      loadFeedPage(0, false);
      fetchTodaySummary(setTodaySummary);
    }, [userId, loadFeedPage]),
  );

  // フィルタ変更時に再フェッチ（初回レンダーはスキップ）
  useEffect(() => {
    if (isFilterInitialRender.current) {
      isFilterInitialRender.current = false;
      return;
    }
    if (!userId) return;
    setPage(0);
    loadFeedPage(0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherFilter, debouncedTagQuery, prefectureFilter, followingOnly]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    let isCancelled = false;
    const setUp = async () => {
      const channelName = `feed-new-posts-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weather_logs' }, () => {
          setHasNewPosts(true);
          fetchTodaySummary(setTodaySummary);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    let isCancelled = false;
    const setUp = async () => {
      const channelName = `unreadCounts-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      await fetchNotificationsData(userId, setUnreadCounts);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
          await fetchNotificationsData(userId, setUnreadCounts);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    let isCancelled = false;
    const setUp = async () => {
      const channelName = `blocks-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, async () => {
          setPage(0);
          await loadFeedPage(0, false);
          await fetchCommentsData(setCommentStatus);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, loadFeedPage]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    let isCancelled = false;
    const setUp = async () => {
      const channelName = `comment-status-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      await fetchCommentsData(setCommentStatus);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
          await fetchCommentsData(setCommentStatus);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    let isCancelled = false;
    const setUp = async () => {
      const channelName = `reaction-status-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      await fetchReactionsData(setReactionStatus);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, async () => {
          await fetchReactionsData(setReactionStatus);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel>;
    let isCancelled = false;
    const setUp = async () => {
      const channelName = `follows-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      await fetchFollowedUserIds(userId, setFollowedUserIds);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` }, async () => {
          await fetchFollowedUserIds(userId, setFollowedUserIds);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleToggleFollow = async (targetUserId: string) => {
    if (!userId) return;
    const isCurrentlyFollowing = followedUserIds.has(targetUserId);
    const newFollowedIds = new Set(followedUserIds);
    if (isCurrentlyFollowing) {
      newFollowedIds.delete(targetUserId);
    } else {
      newFollowedIds.add(targetUserId);
    }
    setFollowedUserIds(newFollowedIds);
    currentFiltersRef.current = { ...currentFiltersRef.current, followedUserIds: Array.from(newFollowedIds) };

    if (isCurrentlyFollowing) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', userId).eq('followed_id', targetUserId);
      if (error) {
        console.error('[index(tab)] handleToggleFollow unfollow', error.message);
        setFollowedUserIds(followedUserIds);
        currentFiltersRef.current = { ...currentFiltersRef.current, followedUserIds: Array.from(followedUserIds) };
      }
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: userId, followed_id: targetUserId });
      if (error) {
        console.error('[index(tab)] handleToggleFollow follow', error.message);
        setFollowedUserIds(followedUserIds);
        currentFiltersRef.current = { ...currentFiltersRef.current, followedUserIds: Array.from(followedUserIds) };
      }
    }

    if (currentFiltersRef.current.followingOnly) {
      setPage(0);
      loadFeedPage(0, false);
    }
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore || isLoading) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    loadFeedPage(nextPage, true).finally(() => {
      setIsLoadingMore(false);
      setPage(nextPage);
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setHasNewPosts(false);
    setPage(0);
    await loadFeedPage(0, false);
    setIsRefreshing(false);
  };

  const isFilterActive = weatherFilter !== null || debouncedTagQuery.length > 0 || prefectureFilter !== null || followingOnly;

  if (roomIsLoading) {
    return (
      <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center px-10">
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="white" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
      <View style={{ paddingTop: 80, flex: 1, paddingHorizontal: 16 }}>
        {/* トップバー：新着バナー＋フィルタトグル */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          {hasNewPosts ? (
            <Pressable
              onPress={handleRefresh}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 100,
                backgroundColor: 'rgba(98,66,33,0.92)',
              }}>
              <Text className="text-xs font-bold text-white text-center">新着があります・タップで更新</Text>
            </Pressable>
          ) : Object.keys(todaySummary).length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 6 }}>
              {Object.entries(WEATHER_CONFIG)
                .filter(([key]) => (todaySummary[key] ?? 0) > 0)
                .map(([key, cfg]) => (
                  <View
                    key={key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 100,
                      backgroundColor: 'rgba(255,255,255,0.85)',
                    }}>
                    <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                      {todaySummary[key]}
                    </Text>
                  </View>
                ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={() => setIsFilterOpen((prev) => !prev)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 100,
              backgroundColor: isFilterOpen || isFilterActive ? WeatherBoardColors.buttonBackground : 'rgba(255,255,255,0.85)',
            }}>
            <Ionicons
              name="options-outline"
              size={14}
              color={isFilterOpen || isFilterActive ? 'white' : WeatherBoardColors.textPrimaryDark}
            />
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: isFilterOpen || isFilterActive ? 'white' : WeatherBoardColors.textPrimaryDark,
            }}>
              絞り込み
            </Text>
          </Pressable>
        </View>

        {/* フィルタバー（トグル展開） */}
        {isFilterOpen && (
          <View style={{ marginBottom: 10, gap: 6 }}>
            {/* 天気フィルタ */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {WEATHER_FILTER_OPTIONS.map(({ label, value }) => {
                const selected = weatherFilter === value;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setWeatherFilter(value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 100,
                      backgroundColor: selected ? WeatherBoardColors.buttonBackground : 'rgba(255,255,255,0.85)',
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* タグ検索 */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.85)',
              borderRadius: 100,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}>
              <Ionicons name="search-outline" size={14} color={WeatherBoardColors.textMutedBlack} style={{ marginRight: 6 }} />
              <TextInput
                value={tagQuery}
                onChangeText={setTagQuery}
                placeholder="タグで検索..."
                placeholderTextColor={WeatherBoardColors.textMutedBlack}
                style={{ flex: 1, fontSize: 13, color: WeatherBoardColors.textPrimaryDark, paddingVertical: 0 }}
              />
              {tagQuery.length > 0 && (
                <Pressable onPress={() => setTagQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={WeatherBoardColors.textMutedBlack} />
                </Pressable>
              )}
            </View>

            {/* 都道府県フィルタ */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <Pressable
                onPress={() => setPrefectureFilter(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: prefectureFilter === null ? WeatherBoardColors.buttonBackground : 'rgba(255,255,255,0.85)',
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: prefectureFilter === null ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                  全国
                </Text>
              </Pressable>
              {PREFECTURES.map((pref) => (
                <Pressable
                  key={pref}
                  onPress={() => setPrefectureFilter(pref)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 100,
                    backgroundColor: prefectureFilter === pref ? WeatherBoardColors.buttonBackground : 'rgba(255,255,255,0.85)',
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: prefectureFilter === pref ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                    {pref}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* フォローフィルタ */}
            <Pressable
              onPress={() => setFollowingOnly((prev) => !prev)}
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 100,
                backgroundColor: followingOnly ? WeatherBoardColors.buttonBackground : 'rgba(255,255,255,0.85)',
              }}>
              <Ionicons name="people-outline" size={13} color={followingOnly ? 'white' : WeatherBoardColors.textPrimaryDark} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: followingOnly ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                フォロー中
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ flex: 1 }}>
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="white" />
            </View>
          ) : boardData.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-base font-bold" style={{ color: 'rgba(0,0,0,0.6)' }}>
                {isFilterActive ? '条件に一致する投稿はありません。' : 'まだ投稿はありません。'}
              </Text>
            </View>
          ) : (
            <WeatherBoard
              weatherLogs={boardData}
              unreadCounts={unreadCounts}
              commentStatus={commentStatus}
              reactionStatus={reactionStatus}
              currentUserId={userId}
              followedUserIds={followedUserIds}
              onToggleFollow={handleToggleFollow}
              onEndReached={handleLoadMore}
              isLoadingMore={isLoadingMore}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
      </View>
      <RoomChatFloatingButton />
    </ImageBackground>
  );
}
