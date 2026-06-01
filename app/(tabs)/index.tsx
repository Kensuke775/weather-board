import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, ImageBackground, Modal, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import WeatherBoard from '@/components/WeatherBoard';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { ActivityFeedItem, CommentsStatus, WeatherBoardItem } from '@/lib/types';

const { height } = Dimensions.get('window');
const WEATHER_IMAGES = {
  sunny: require('@/assets/images/weather/sunny.png'),
  partly_cloudy: require('@/assets/images/weather/partly_cloudy.png'),
  cloudy: require('@/assets/images/weather/cloudy.png'),
  rainy: require('@/assets/images/weather/rainy.png'),
  stormy: require('@/assets/images/weather/stormy.png'),
  snowy: require('@/assets/images/weather/snowy.png'),
  foggy: require('@/assets/images/weather/foggy.png'),
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
  const commentersMap = commentsData.reduce((acc, status) => {
    const profiles = status.profiles as { avatar_emoji: string } | { avatar_emoji: string }[];
    const avatars = Array.isArray(profiles) ? profiles[0].avatar_emoji : profiles?.avatar_emoji;
    const isIncludes = acc[status.weather_log_id]?.commenters.some((commenter) => commenter.user_id === status.user_id);
    acc[status.weather_log_id] = { commenters: [...(acc[status.weather_log_id]?.commenters ?? []), ...(isIncludes ? [] : [{ user_id: status.user_id, emoji: avatars }])], count: (acc[status.weather_log_id]?.count ?? 0) + 1 };
    return acc;
  }, {} as CommentsStatus);

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
    .eq('room_id', roomId);

  if (weatherLogsError) {
    console.error('[index(tab)] fetchBoardData', weatherLogsError.message);
    Alert.alert('ログの取得に失敗しました。');
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

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [boardData, setBoardData] = useState<WeatherBoardItem[]>([]);
  const [userData, setUserData] = useState<WeatherBoardItem | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [commentStatus, setCommentStatus] = useState<CommentsStatus>({});
  const { currentRoomId, setCurrentRoomId, rooms } = useRoom();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>();
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const fetchCurrentRoom = async () => {
        const { data: roomData, error: roomError } = await supabase.from('room_members').select('room_id').eq('user_id', user.id);
        if (roomError) {
          console.error('[index(tab)] fetchCurrentRoom', roomError.message);
          Alert.alert('ルームの取得に失敗しました。');
          return;
        }
        if (roomData.length === 0) return router.replace('/(auth)/room-setup');
        setCurrentRoomId(roomData[0]?.room_id);
      };
      fetchCurrentRoom();
    }, [setCurrentRoomId, router, user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentRoomId) return;
      const channelName = `board-${currentRoomId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) supabase.removeChannel(existing);
      fetchBoardData(currentRoomId, setBoardData, setIsLoading);
      const channel: ReturnType<typeof supabase.channel> = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_logs' }, () => {
          fetchBoardData(currentRoomId, setBoardData, setIsLoading);
        })
        .subscribe();

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }, [currentRoomId]),
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      if (!user) return;
      const channelName = `unreadCounts-${user.id}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      fetchNotificationsData(user.id, setUnreadCounts);
      fetchActivityFeed(currentRoomId, setActivityFeed);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotificationsData(user.id, setUnreadCounts);
          fetchActivityFeed(currentRoomId, setActivityFeed);
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentRoomId, user]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    if (!user) return;
    const setUp = async (userId: string) => {
      const channelName = `comment-status-${userId}`;
      const existing = supabase.getChannels().find((channel) => channel.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);

      fetchCommentsData(setCommentStatus);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
          fetchCommentsData(setCommentStatus);
        })
        .subscribe();
    };
    setUp(user.id);
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const fetchUserData = () => {
        const userData = boardData.filter((data) => data.user_id === user.id);
        if (userData.length > 0) setUserData(userData[0]);
      };
      fetchUserData();
    }, [boardData, user]),
  );

  const backgroundImage = userData ? WEATHER_IMAGES[userData.weather] : WEATHER_IMAGES.sunny;
  const inviteCode = rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.invite_code;
  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
      <View className="pt-20 flex-1">
        <View>
          <View className="flex-row justify-center mb-4">
            <View className="flex-row justify-between bg-black/30 rounded-xl border gap-4" style={{ borderColor: WeatherBoardColors.glassBorder }}>
              <Pressable onPress={() => setIsModalVisible(true)} className="py-3 pl-4">
                <View className="flex-row items-center gap-2" style={{ minWidth: 100 }}>
                  {currentRoomId ? (
                    <Text className="font-sm font-bold" style={{ color: WeatherBoardColors.textPrimary, minWidth: 80 }}>
                      {rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.name}
                    </Text>
                  ) : (
                    <View className="w-20 h-4 rounded-full bg-white/20" />
                  )}
                  <Ionicons name="chevron-down" size={16} color="white" />
                </View>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const code = rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.invite_code;
                  if (code) await Clipboard.setStringAsync(code);
                  Toast.show({
                    type: 'success',
                    text1: 'コピーしました。',
                    visibilityTime: 1000,
                  });
                }}
                className="py-3 pr-4">
                <View className="flex-row items-center gap-2 justify-between" style={{ minWidth: 100 }}>
                  {inviteCode ? (
                    <Text className="font-sm font-bold" style={{ color: WeatherBoardColors.textPrimary, minWidth: 80 }}>
                      {rooms.find((data) => data.rooms.id === currentRoomId)?.rooms.invite_code}
                    </Text>
                  ) : (
                    <View className="w-20 h-4 rounded-full bg-white/20" />
                  )}
                  <Ionicons name="copy-outline" size={16} color="white" />
                </View>
              </Pressable>
            </View>
          </View>

          <Modal visible={isModalVisible} transparent={true} animationType="slide">
            <Pressable style={{ flex: 1 }} onPress={() => setIsModalVisible(false)}>
              <View onStartShouldSetResponder={() => true} className="pb-32" style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white' }}>
                <Text className="text-center font-bold pt-8">部屋を選んでください</Text>
                <Picker
                  selectedValue={currentRoomId}
                  onValueChange={(value) => {
                    setCurrentRoomId(value);
                  }}>
                  {rooms.map((room) => (
                    <Picker.Item key={room.rooms.id} label={room.rooms.name} value={room.rooms.id} />
                  ))}
                </Picker>
              </View>
            </Pressable>
          </Modal>
        </View>

        <View className="px-4" style={{ height: height * 0.65 }}>
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="white" />
            </View>
          ) : boardData.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                まだ投稿はありません。
              </Text>
            </View>
          ) : (
            <WeatherBoard weatherLogs={boardData} unreadCounts={unreadCounts} commentStatus={commentStatus} />
          )}
        </View>

        <View className="bg-black/30 flex-1 p-6" style={{ borderTopWidth: 1, borderTopColor: WeatherBoardColors.glassBorder }}>
          <View style={{ height: 50 }}>
            <FlatList
              data={activityFeed}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View className="h-4" />}
              contentContainerStyle={{ paddingHorizontal: 40 }}
              snapToInterval={32}
              renderItem={({ item }) => (
                <View className="flex-row gap-3">
                  <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMuted }}>
                    {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text className="text-[10px]" style={{ color: WeatherBoardColors.textMuted }}>
                    {item.from.avatar_emoji} {item.from.nickname}が {item.to.avatar_emoji}
                    {item.to.nickname}にコメントしました。
                  </Text>
                </View>
              )}></FlatList>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}
