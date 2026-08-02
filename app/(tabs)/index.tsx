import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';

import ActivityFeedSheet from '@/components/ActivityFeedSheet';
import FilterSheet from '@/components/FilterSheet';
import JapanMapFloatingButton from '@/components/JapanMapFloatingButton';
import RoomChatFloatingButton from '@/components/RoomChatFloatingButton';
import WeatherBoard from '@/components/WeatherBoard';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { useSupabaseRealtimeSync } from '@/hooks/useSupabaseRealtimeSync';
import { isDaytimeNow } from '@/lib/date';
import {
  DEFAULT_FILTERS,
  FEED_PAGE_SIZE,
  fetchActivityFeed,
  fetchCommentsData,
  fetchFeedPage,
  fetchFollowedUserIds,
  fetchNotificationsData,
  fetchReactionsData,
  fetchTodaySummary,
  FeedFilters,
} from '@/lib/homeFeed';
import { supabase } from '@/lib/supabase';
import { ActivityFeedItem, CommentsStatus, WEATHER_CONFIG, WeatherBoardItem, WeatherType } from '@/lib/types';

const backgroundImage = isDaytimeNow() ? require('@/assets/images/weather/index-bg-day.jpg') : require('@/assets/images/weather/index-bg-night.jpg');

// トップバーに並ぶピル状ボタン（本日の天気サマリー・絞り込み・アクティビティフィードなど）の高さを統一する。
const TOP_BAR_PILL_HEIGHT = 26;

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

  useSupabaseRealtimeSync({
    channelName: `unreadCounts-${userId ?? 'none'}`,
    table: 'notifications',
    callback: () => (userId ? fetchNotificationsData(userId, setUnreadCounts) : Promise.resolve()),
  });

  useSupabaseRealtimeSync({
    channelName: `blocks-${userId ?? 'none'}`,
    table: 'blocks',
    skipInitialFetch: true,
    callback: async () => {
      if (!userId) return;
      setPage(0);
      await loadFeedPage(0, false);
      await fetchCommentsData(setCommentStatus);
    },
  });

  useSupabaseRealtimeSync({
    channelName: `comment-status-${userId ?? 'none'}`,
    table: 'comments',
    callback: () => (userId ? fetchCommentsData(setCommentStatus) : Promise.resolve()),
  });

  useSupabaseRealtimeSync({
    channelName: `reaction-status-${userId ?? 'none'}`,
    table: 'post_reactions',
    callback: () => (userId ? fetchReactionsData(setReactionStatus) : Promise.resolve()),
  });

  useSupabaseRealtimeSync({
    channelName: `follows-${userId ?? 'none'}`,
    table: 'follows',
    filter: userId ? `follower_id=eq.${userId}` : undefined,
    callback: () => (userId ? fetchFollowedUserIds(userId, setFollowedUserIds) : Promise.resolve()),
  });

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
      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.1)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
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
              <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>本日:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
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
                      <Text style={{ fontSize: 10, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{todaySummary[key]}</Text>
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
            <Ionicons name="options-outline" size={14} color={isFilterActive ? 'white' : WeatherBoardColors.textPrimaryDark} />
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

      <FilterSheet
        bottomSheetRef={filterSheetRef}
        tabBarHeight={tabBarHeight}
        weatherFilter={weatherFilter}
        setWeatherFilter={setWeatherFilter}
        tagQuery={tagQuery}
        setTagQuery={setTagQuery}
        prefectureFilter={prefectureFilter}
        setPrefectureFilter={setPrefectureFilter}
        followingOnly={followingOnly}
        setFollowingOnly={setFollowingOnly}
      />
      <ActivityFeedSheet bottomSheetRef={activityFeedSheetRef} activityFeed={activityFeed} tabBarHeight={tabBarHeight} />
    </ImageBackground>
  );
}
