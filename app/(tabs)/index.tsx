import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, ImageBackground, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

import ActivityFeedSheet from '@/components/ActivityFeedSheet';
import RoomMemberPanel from '@/components/RoomMemberPanel';
import RoomSelectorHeader from '@/components/RoomSelectorHeader';
import WeatherBoard from '@/components/WeatherBoard';
import { WeatherBoardColors } from '@/constants/theme';
import { ROOM_MEMBER_PANEL_WIDTH, SLIDE_ANIMATION_DURATION } from '@/constants/ui';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { ActivityFeedItem, CommentsStatus, RoomMember, WeatherBoardItem } from '@/lib/types';
import BottomSheet from '@gorhom/bottom-sheet';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const { height } = Dimensions.get('window');

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');


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
    const profiles = status.profiles as { avatar_emoji: string } | { avatar_emoji: string }[];
    const avatars = Array.isArray(profiles) ? profiles[0].avatar_emoji : profiles?.avatar_emoji;
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

const fetchBoardData = async (roomId: string | null, setter: (data: WeatherBoardItem[]) => void, loadingSetter: (loading: boolean) => void) => {
  const { data: roomMembersData, error: roomMembersError } = await supabase.from('room_members').select('user_id').eq('room_id', roomId);
  if (roomMembersError) {
    console.error('[index(tab)] fetchBoardData', roomMembersError.message);
    Alert.alert('天気・タグ・プロフィールの取得に失敗しました。');
    return;
  }
  const userIds = roomMembersData.map((data) => data.user_id);
  const { data: weatherLogsData, error: weatherLogsError } = await supabase
    .from('weather_logs')
    .select('id, user_id, weather, note, updated_at, profiles(nickname, avatar_emoji), weather_log_activities(activity_tag_id, activity_tags(tag_name))')
    .in('user_id', userIds)
    .eq('room_id', roomId)
    .order('updated_at', { ascending: false });

  if (weatherLogsError) {
    console.error('[index(tab)] fetchBoardData', weatherLogsError.message);
    Alert.alert('ログの取得に失敗しました。');
    return;
  }

  const mostNewLogs = weatherLogsData.reduce(
    (acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = item;
      } else {
        if (item.updated_at > acc[item.user_id].updated_at) acc[item.user_id] = item;
      }
      return acc;
    },
    {} as Record<string, (typeof weatherLogsData)[0]>,
  );

  const formattedData = Object.values(mostNewLogs).map((log) => ({
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

const fetchActivityFeed = async (roomId: string | null, setter: (data: ActivityFeedItem[]) => void) => {
  if (!roomId) return;
  const { data: activityFeedData, error: activityFeedError } = await supabase
    .from('notifications')
    .select('id, to_user_id, from_user_id, created_at, from:profiles!from_user_id(nickname, avatar_emoji), to:profiles!to_user_id(nickname, avatar_emoji)')
    .order('created_at', { ascending: false })
    .eq('type', 'comment')
    .eq('room_id', roomId)
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


const fetchRoomMember = async (roomId: string, userId: string, setter: (data: RoomMember[]) => void) => {
  if (!roomId) return;
  const { data: roomMemberData, error: roomMemberError } = await supabase.from('room_members').select('user_id').eq('room_id', roomId);
  if (roomMemberError) {
    console.error('[index(tab)] fetchRoomMember', roomMemberError.message);
    Alert.alert('ルームメンバーの取得に失敗しました。');
    return;
  }
  const userIds = roomMemberData.map((item) => item.user_id);
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('nickname, avatar_emoji, user_id').in('user_id', userIds);
  if (profileError) {
    console.error('[index(tab)] fetchRoomMember', profileError.message);
    Alert.alert('プロフィールの取得に失敗しました。');
    return;
  }
  const { data: blockedData, error: blockedError } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId);
  if (blockedError) {
    console.error('[index(tab)] fetchRoomMember', blockedError.message);
    Alert.alert('ブロック情報の取得に失敗しました。');
    return;
  }
  const blockedIds = new Set(blockedData.map((item) => item.blocked_id));
  setter(profileData.filter((item) => !blockedIds.has(item.user_id)));
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { currentRoomId, setCurrentRoomId, rooms, isLoading: roomIsLoading } = useRoom();
  const [boardData, setBoardData] = useState<WeatherBoardItem[]>([]);
  const [userData, setUserData] = useState<WeatherBoardItem | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [commentStatus, setCommentStatus] = useState<CommentsStatus>({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomMember, setRoomMember] = useState<RoomMember[]>([]);
  const [isMemberVisible, setIsMemberVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-ROOM_MEMBER_PANEL_WIDTH)).current;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();

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
      if (!currentRoomId) return;
      let channel: ReturnType<typeof supabase.channel>;
      let isCancelled = false;
      const setUp = async () => {
        const channelName = `board-${currentRoomId}`;
        const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
        if (existing) await supabase.removeChannel(existing);
        if (isCancelled) return;
        await fetchBoardData(currentRoomId, setBoardData, setIsLoading);
        if (isCancelled) return;
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_logs' }, async () => {
            await fetchBoardData(currentRoomId, setBoardData, setIsLoading);
          })
          .subscribe();
      };
      setUp();
      return () => {
        isCancelled = true;
        if (channel) supabase.removeChannel(channel);
      };
    }, [currentRoomId]),
  );

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
      await fetchActivityFeed(currentRoomId, setActivityFeed);
      if (isCancelled) return;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
          await fetchNotificationsData(userId, setUnreadCounts);
          await fetchActivityFeed(currentRoomId, setActivityFeed);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentRoomId, userId]);

  useEffect(() => {
    if (!userId || !currentRoomId) return;
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
          await fetchBoardData(currentRoomId, setBoardData, setIsLoading);
          await fetchCommentsData(setCommentStatus);
          await fetchRoomMember(currentRoomId, userId, setRoomMember);
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentRoomId, userId]);

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

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const fetchUserData = () => {
        const userLogs = boardData.filter((data) => data.user_id === userId);
        if (userLogs.length > 0) setUserData(userLogs[0]);
      };
      fetchUserData();
    }, [boardData, userId]),
  );

  useFocusEffect(
    useCallback(() => {
      bottomSheetRef?.current?.close();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentRoomId || !userId) return;
      fetchRoomMember(currentRoomId, userId, setRoomMember);
    }, [currentRoomId, userId]),
  );

  const openMemberPanel = () => {
    setIsMemberVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: SLIDE_ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const closeMemberPanel = () => {
    Animated.timing(slideAnim, {
      toValue: -ROOM_MEMBER_PANEL_WIDTH,
      duration: SLIDE_ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => setIsMemberVisible(false));
  };

  const openBottomSheet = () => {
    bottomSheetRef.current?.expand();
  };

  const inviteCode = rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.invite_code;

  if (roomIsLoading || !currentRoomId) {
    return (
      <ImageBackground source={backgroundImage} className="flex-1 justify-center items-center px-10">
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
        {roomIsLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : (
          <Text className="text-base font-bold text-center" style={{ color: 'white' }}>
            現在参加しているルームはありません。{'\n'}設定からルームを作成・参加してください。
          </Text>
        )}
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
      <View style={{ paddingTop: 80, flex: 1, paddingHorizontal: 16 }}>
        <RoomSelectorHeader
          rooms={rooms}
          currentRoomId={currentRoomId}
          setCurrentRoomId={setCurrentRoomId}
          inviteCode={inviteCode}
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          onMemberPanelOpen={openMemberPanel}
        />
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
            <WeatherBoard weatherLogs={boardData} unreadCounts={unreadCounts} commentStatus={commentStatus} />
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
      <RoomMemberPanel
        roomMember={roomMember}
        userId={userId}
        visible={isMemberVisible}
        slideAnim={slideAnim}
        onClose={closeMemberPanel}
      />
      <ActivityFeedSheet
        bottomSheetRef={bottomSheetRef}
        onSheetChange={(index) => {
          navigation.setOptions({
            tabBarStyle: index >= 0
              ? { display: 'none' }
              : {
                  backgroundColor: 'white',
                  borderTopWidth: 0,
                  position: 'absolute',
                  marginHorizontal: 16,
                  marginBottom: Platform.OS === 'android' ? 4 : bottom - 4,
                  borderRadius: 28,
                  height: 60,
                  paddingTop: 6,
                  paddingBottom: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.18,
                  shadowRadius: 16,
                  elevation: 10,
                },
          });
        }}
        activityFeed={activityFeed}
        tabBarHeight={tabBarHeight}
      />
    </ImageBackground>
  );
}
