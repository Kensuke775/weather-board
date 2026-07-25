import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import ActivityFeedSheet from '@/components/ActivityFeedSheet';
import JapanMapFloatingButton from '@/components/JapanMapFloatingButton';
import RoomChatFloatingButton from '@/components/RoomChatFloatingButton';
import WeatherBoard from '@/components/WeatherBoard';
import { PREFECTURES } from '@/constants/prefectures';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { isDaytimeNow, toDateString } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { ActivityFeedItem, CommentsStatus, WEATHER_CONFIG, WeatherBoardItem, WeatherType } from '@/lib/types';

const backgroundImage = isDaytimeNow()
  ? require('@/assets/images/weather/index-bg-day.jpg')
  : require('@/assets/images/weather/index-bg-night.jpg');

const FEED_PAGE_SIZE = 20;
// トップバーに並ぶピル状ボタン（本日の天気サマリー・絞り込み・アクティビティフィードなど）の高さを統一する。
const TOP_BAR_PILL_HEIGHT = 26;

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
  const today = toDateString();
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

// comments → weather_logs → profiles のネストしたembedは使わず、段階的に取得してJSでマージする
// （lib/date.ts と同じ理由。詳しくはメモリのfeedback-postgrest-nested-embedsを参照）。
const fetchActivityFeed = async (setter: (data: ActivityFeedItem[]) => void) => {
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('id, user_id, weather_log_id, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (commentsError) {
    console.error('[index(tab)] fetchActivityFeed', commentsError.message);
    return;
  }
  if (commentsData.length === 0) {
    setter([]);
    return;
  }

  const logIds = Array.from(new Set(commentsData.map((c) => c.weather_log_id)));
  const { data: logsData, error: logsError } = await supabase.from('weather_logs').select('id, user_id').in('id', logIds);
  if (logsError) {
    console.error('[index(tab)] fetchActivityFeed', logsError.message);
    return;
  }
  const ownerIdByLogId = new Map(logsData.map((log) => [log.id, log.user_id]));

  const userIds = Array.from(new Set([...commentsData.map((c) => c.user_id), ...logsData.map((log) => log.user_id)]));
  const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('user_id, nickname, avatar_emoji').in('user_id', userIds);
  if (profilesError) {
    console.error('[index(tab)] fetchActivityFeed', profilesError.message);
    return;
  }
  const profileByUserId = new Map(profilesData.map((profile) => [profile.user_id, { nickname: profile.nickname, avatar_emoji: profile.avatar_emoji }]));

  const items: ActivityFeedItem[] = commentsData
    .map((comment) => {
      const toUserId = ownerIdByLogId.get(comment.weather_log_id);
      if (!toUserId) return null;
      return {
        id: comment.id,
        from_user_id: comment.user_id,
        to_user_id: toUserId,
        weather_log_id: comment.weather_log_id,
        created_at: comment.created_at,
        from: profileByUserId.get(comment.user_id) ?? null,
        to: profileByUserId.get(toUserId) ?? null,
      };
    })
    .filter((item): item is ActivityFeedItem => item !== null);

  setter(items);
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

// weather_log_activities → activity_tags のネストしたembedは、room_members↔profiles・follows↔profiles と
// 同様にPostgRESTのリレーション解決が不安定（同一セッション内でも結果が空になることがある）なため使わず、
// 2段階取得＋JSでのマージに統一する。
// Supabase側のPostgRESTスキーマキャッシュが一時的に不安定になり、エラーにはならず
// 「正常に空」の結果が返ってくることがある。空だった場合は1回だけ間を置いて再取得する。
const fetchWeatherLogActivitiesWithRetry = async (logIds: string[]) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await supabase.from('weather_log_activities').select('weather_log_id, activity_tag_id').in('weather_log_id', logIds);
    if (result.error || result.data.length > 0) return result;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return supabase.from('weather_log_activities').select('weather_log_id, activity_tag_id').in('weather_log_id', logIds);
};

const fetchTagsByLogIds = async (logIds: string[]): Promise<Map<string, { id: string; name: string }[]>> => {
  const tagsByLogId = new Map<string, { id: string; name: string }[]>();
  if (logIds.length === 0) return tagsByLogId;

  const { data: activitiesData, error: activitiesError } = await fetchWeatherLogActivitiesWithRetry(logIds);
  if (activitiesError) {
    console.error('[index(tab)] fetchTagsByLogIds', activitiesError.message);
    return tagsByLogId;
  }

  const tagIds = Array.from(new Set(activitiesData.map((row) => row.activity_tag_id).filter((id): id is string => id !== null)));
  if (tagIds.length === 0) return tagsByLogId;

  const { data: tagsData, error: tagsError } = await supabase.from('activity_tags').select('id, tag_name').in('id', tagIds);
  if (tagsError) {
    console.error('[index(tab)] fetchTagsByLogIds', tagsError.message);
    return tagsByLogId;
  }
  const tagNameById = new Map(tagsData.map((tag) => [tag.id, tag.tag_name]));

  // weather_log_activities に同じ (weather_log_id, activity_tag_id) の行が一時的に重複することがあるため、
  // Set で重複を弾く。list.some() による O(n²) スキャンを O(1) に置き換える。
  const seenTagIdsByLogId = new Map<string, Set<string>>();
  for (const activity of activitiesData) {
    if (!activity.activity_tag_id) continue;
    const tagName = tagNameById.get(activity.activity_tag_id);
    if (!tagName) continue;
    let seenIds = seenTagIdsByLogId.get(activity.weather_log_id);
    if (!seenIds) {
      seenIds = new Set();
      seenTagIdsByLogId.set(activity.weather_log_id, seenIds);
      tagsByLogId.set(activity.weather_log_id, []);
    }
    if (seenIds.has(activity.activity_tag_id)) continue;
    seenIds.add(activity.activity_tag_id);
    tagsByLogId.get(activity.weather_log_id)!.push({ id: activity.activity_tag_id, name: tagName });
  }
  return tagsByLogId;
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

  let matchingLogIdsByTag: string[] | null = null;
  if (hasTagFilter) {
    const { data: matchingTagsData, error: matchingTagsError } = await supabase
      .from('activity_tags')
      .select('id')
      .ilike('tag_name', `%${filters.tag.trim()}%`);
    if (matchingTagsError) {
      console.error('[index(tab)] fetchFeedPage(tagSearch)', matchingTagsError.message);
      Alert.alert('投稿の取得に失敗しました。');
      return;
    }
    const tagIds = matchingTagsData.map((tag) => tag.id);
    if (tagIds.length === 0) {
      setter([]);
      loadingSetter(false);
      return;
    }
    const { data: matchingActivitiesData, error: matchingActivitiesError } = await supabase
      .from('weather_log_activities')
      .select('weather_log_id')
      .in('activity_tag_id', tagIds);
    if (matchingActivitiesError) {
      console.error('[index(tab)] fetchFeedPage(tagSearch)', matchingActivitiesError.message);
      Alert.alert('投稿の取得に失敗しました。');
      return;
    }
    matchingLogIdsByTag = Array.from(new Set(matchingActivitiesData.map((row) => row.weather_log_id)));
    if (matchingLogIdsByTag.length === 0) {
      setter([]);
      loadingSetter(false);
      return;
    }
  }

  // Supabase の .select() はクエリ文字列がリテラル型でないと戻り値の型を推論できない
  // （テンプレートリテラルで組み立てると string に広がり GenericStringError になる）ため、
  // リテラルのまま持つ三項演算子で組み立てている。
  const selectQuery = hasPrefectureFilter
    ? 'id, user_id, weather, note, updated_at, profiles!inner(nickname, avatar_emoji, prefecture)'
    : 'id, user_id, weather, note, updated_at, profiles(nickname, avatar_emoji, prefecture)';

  let query = supabase
    .from('weather_logs')
    .select(selectQuery)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (filters.weather) query = query.eq('weather', filters.weather);
  if (hasPrefectureFilter) query = query.eq('profiles.prefecture', filters.prefecture);
  if (filters.followingOnly) query = query.in('user_id', filters.followedUserIds);
  if (matchingLogIdsByTag) query = query.in('id', matchingLogIdsByTag);

  const { data: weatherLogsData, error: weatherLogsError } = await query;

  if (weatherLogsError) {
    console.error('[index(tab)] fetchFeedPage', weatherLogsError.message);
    Alert.alert('投稿の取得に失敗しました。');
    return;
  }

  const tagsByLogId = await fetchTagsByLogIds(weatherLogsData.map((log) => log.id));

  const formattedData = weatherLogsData.map((log) => ({
    ...log,
    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
    tags: tagsByLogId.get(log.id) ?? [],
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
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [weatherFilter, setWeatherFilter] = useState<WeatherType | null>(null);
  const [tagQuery, setTagQuery] = useState('');
  const [debouncedTagQuery, setDebouncedTagQuery] = useState('');
  const [prefectureFilter, setPrefectureFilter] = useState<string | null>(null);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());

  const currentFiltersRef = useRef<FeedFilters>(DEFAULT_FILTERS);
  const isFilterInitialRender = useRef(true);
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const tagInputRef = useRef<React.ComponentRef<typeof BottomSheetTextInput>>(null);
  const activityFeedSheetRef = useRef<BottomSheetModal>(null);
  const tabBarHeight = useBottomTabBarHeight();

  const handleOpenActivityFeed = () => {
    activityFeedSheetRef.current?.present();
    fetchActivityFeed(setActivityFeed);
  };

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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weather_logs' }, (payload) => {
          if (payload.new.user_id !== userId) setHasNewPosts(true);
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

  const handleResetFilters = () => {
    setWeatherFilter(null);
    setTagQuery('');
    tagInputRef.current?.clear();
    setPrefectureFilter(null);
    setFollowingOnly(false);
  };

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
      <View className="absolute inset-0" />
      <View style={{ paddingTop: 80, flex: 1 }}>
        {/* トップバー：新着バナー＋フィルタトグル */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8, paddingHorizontal: 16 }}>
          {hasNewPosts ? (
            <Pressable
              onPress={handleRefresh}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 100,
                backgroundColor: WeatherBoardColors.buttonBackground,
              }}>
              <Text className="text-xs font-bold text-white text-center">新着があります・タップで更新</Text>
            </Pressable>
          ) : Object.keys(todaySummary).length > 0 ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                本日:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ gap: 4 }}>
                {Object.entries(WEATHER_CONFIG)
                  .filter(([key]) => (todaySummary[key] ?? 0) > 0)
                  .map(([key, cfg]) => (
                    <View
                      key={key}
                      accessibilityLabel={`本日の${cfg.label}の投稿 ${todaySummary[key]}件`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        height: TOP_BAR_PILL_HEIGHT,
                        paddingHorizontal: 6,
                        borderRadius: 100,
                        backgroundColor: 'rgba(255,255,255,0.85)',
                      }}>
                      <Text style={{ fontSize: 11 }}>{cfg.emoji}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                        {todaySummary[key]}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={() => filterSheetRef.current?.present()}
            accessibilityLabel="絞り込み"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: TOP_BAR_PILL_HEIGHT,
              height: TOP_BAR_PILL_HEIGHT,
              borderRadius: 100,
              backgroundColor: isFilterActive ? WeatherBoardColors.buttonBackground : 'rgba(255,255,255,0.85)',
            }}>
            <Ionicons
              name="options-outline"
              size={14}
              color={isFilterActive ? 'white' : WeatherBoardColors.textPrimaryDark}
            />
          </Pressable>
          <Pressable
            onPress={handleOpenActivityFeed}
            accessibilityLabel="アクティビティフィード"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: TOP_BAR_PILL_HEIGHT,
              height: TOP_BAR_PILL_HEIGHT,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.85)',
            }}>
            <Ionicons name="pulse-outline" size={14} color={WeatherBoardColors.textPrimaryDark} />
          </Pressable>
        </View>

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
              onEndReached={handleLoadMore}
              isLoadingMore={isLoadingMore}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
      </View>
      <JapanMapFloatingButton />
      <RoomChatFloatingButton />

      <BottomSheetModal
        ref={filterSheetRef}
        snapPoints={['55%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: WeatherBoardColors.divider }}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}>
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>絞り込み</Text>
            <Pressable onPress={handleResetFilters}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: WeatherBoardColors.buttonBackground }}>リセット</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>天気</Text>
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
                      backgroundColor: selected ? WeatherBoardColors.buttonBackground : WeatherBoardColors.tagBackground,
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>タグ</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: WeatherBoardColors.tagBackground,
              borderRadius: 100,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}>
              <Ionicons name="search-outline" size={14} color={WeatherBoardColors.textMutedBlack} style={{ marginRight: 6 }} />
              <BottomSheetTextInput
                ref={tagInputRef}
                defaultValue={tagQuery}
                onChangeText={setTagQuery}
                placeholder="タグで検索..."
                placeholderTextColor={WeatherBoardColors.textMutedBlack}
                style={{ flex: 1, fontSize: 13, color: WeatherBoardColors.textPrimaryDark, paddingVertical: 0 }}
              />
              {tagQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setTagQuery('');
                    tagInputRef.current?.clear();
                  }}
                  hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={WeatherBoardColors.textMutedBlack} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>エリア</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <Pressable
                onPress={() => setPrefectureFilter(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: prefectureFilter === null ? WeatherBoardColors.buttonBackground : WeatherBoardColors.tagBackground,
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
                    backgroundColor: prefectureFilter === pref ? WeatherBoardColors.buttonBackground : WeatherBoardColors.tagBackground,
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: prefectureFilter === pref ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                    {pref}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: WeatherBoardColors.textMutedBlack }}>フォロー</Text>
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
                backgroundColor: followingOnly ? WeatherBoardColors.buttonBackground : WeatherBoardColors.tagBackground,
              }}>
              <Ionicons name="people-outline" size={13} color={followingOnly ? 'white' : WeatherBoardColors.textPrimaryDark} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: followingOnly ? 'white' : WeatherBoardColors.textPrimaryDark }}>
                フォロー中の投稿のみ
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => filterSheetRef.current?.dismiss()}
            style={{
              backgroundColor: WeatherBoardColors.buttonBackground,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>閉じる</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
      <ActivityFeedSheet bottomSheetRef={activityFeedSheetRef} activityFeed={activityFeed} tabBarHeight={tabBarHeight} />
    </ImageBackground>
  );
}
