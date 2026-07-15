import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, Text, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import ActivityFeedSheet from '@/components/ActivityFeedSheet';
import WeatherBoard from '@/components/WeatherBoard';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { ActivityFeedItem, CommentsStatus, WeatherBoardItem } from '@/lib/types';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');

const FEED_PAGE_SIZE = 20;

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
      entry.users.set(status.user_id, avatars); // user_id → emoji のMap
    }
    entry.count += 1;
  }

  // CommentsStatus の形に変換
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

const fetchFeedPage = async (page: number, setter: (data: WeatherBoardItem[]) => void, loadingSetter: (loading: boolean) => void) => {
  const from = page * FEED_PAGE_SIZE;
  const to = from + FEED_PAGE_SIZE - 1;
  const { data: weatherLogsData, error: weatherLogsError } = await supabase
    .from('weather_logs')
    .select('id, user_id, weather, note, updated_at, profiles(nickname, avatar_emoji), weather_log_activities(activity_tag_id, activity_tags(tag_name))')
    .order('updated_at', { ascending: false })
    .range(from, to);

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

const fetchActivityFeed = async (userId: string, setter: (data: ActivityFeedItem[]) => void) => {
  const { data: activityFeedData, error: activityFeedError } = await supabase
    .from('notifications')
    .select('id, to_user_id, from_user_id, created_at, from:profiles!from_user_id(nickname, avatar_emoji), to:profiles!to_user_id(nickname, avatar_emoji)')
    .order('created_at', { ascending: false })
    .eq('type', 'comment')
    .eq('to_user_id', userId)
    .limit(10);
  if (activityFeedError) {
    console.error('[index(tab)] fetchActivityFeed', activityFeedError.message);
    Alert.alert('アクティビティフィードの取得に失敗しました。');
    return;
  }
  const formattedData = activityFeedData.map((data) => ({
    ...data,
    from: Array.isArray(data.from) ? data.from[0] : data.from,
    to: Array.isArray(data.to) ? data.to[0] : data.to,
  }));

  setter(formattedData);
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { currentRoomId, setCurrentRoomId, isLoading: roomIsLoading } = useRoom();
  const [boardData, setBoardData] = useState<WeatherBoardItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [commentStatus, setCommentStatus] = useState<CommentsStatus>({});
  const [reactionStatus, setReactionStatus] = useState<Record<string, number>>({});
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const tabBarHeight = useBottomTabBarHeight();

  const loadFeedPage = useCallback(async (pageToLoad: number, append: boolean) => {
    await fetchFeedPage(
      pageToLoad,
      (data) => {
        setBoardData((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === FEED_PAGE_SIZE);
      },
      setIsLoading,
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
        if (roomData.length === 0) return router.replace('/(auth)/room-setup');
        if (!currentRoomId) setCurrentRoomId(roomData[0]?.room_id);
      };
      fetchCurrentRoom();
    }, [setCurrentRoomId, router, userId, currentRoomId]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setPage(0);
      loadFeedPage(0, false);
    }, [userId, loadFeedPage]),
  );

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
      await fetchActivityFeed(userId, setActivityFeed);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
          await fetchNotificationsData(userId, setUnreadCounts);
          await fetchActivityFeed(userId, setActivityFeed);
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

  useFocusEffect(
    useCallback(() => {
      bottomSheetRef?.current?.dismiss();
    }, []),
  );

  const openBottomSheet = () => {
    bottomSheetRef.current?.present();
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
        {hasNewPosts && (
          <Pressable
            onPress={handleRefresh}
            style={{
              alignSelf: 'center',
              marginBottom: 12,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 100,
              backgroundColor: 'rgba(98,66,33,0.92)',
            }}>
            <Text className="text-xs font-bold text-white">新着があります・タップで更新</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="white" />
            </View>
          ) : boardData.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-base font-bold" style={{ color: 'rgba(0,0,0,0.6)' }}>
                まだ投稿はありません。
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
        <Pressable
          onPress={openBottomSheet}
          style={{ alignItems: 'center', paddingTop: 10, paddingBottom: tabBarHeight + 40 }}>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 24,
              paddingVertical: 8,
              paddingHorizontal: 28,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.6)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 6,
            }}>
            <Text className="text-sm font-bold" style={{ color: '#624221' }}>
              Activity Feed
            </Text>
            <Text>💬</Text>
          </View>
        </Pressable>
      </View>
      <ActivityFeedSheet
        bottomSheetRef={bottomSheetRef}
        activityFeed={activityFeed}
        tabBarHeight={tabBarHeight}
      />
    </ImageBackground>
  );
}
