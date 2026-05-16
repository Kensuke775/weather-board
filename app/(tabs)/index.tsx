import WeatherBoard from '@/components/WeatherBoard';
import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { CommentsStatus, WeatherBoardItem } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Text, View } from 'react-native';

const WEATHER_IMAGES = {
  sunny: require('@/assets/images/weather/sunny.png'),
  partly_cloudy: require('@/assets/images/weather/partly_cloudy.png'),
  cloudy: require('@/assets/images/weather/cloudy.png'),
  rainy: require('@/assets/images/weather/rainy.png'),
  stormy: require('@/assets/images/weather/stormy.png'),
  snowy: require('@/assets/images/weather/snowy.png'),
  foggy: require('@/assets/images/weather/foggy.png'),
};

// 今日のボードデータ（天気・タグ・プロフィール）を取得
const fetchBoardData = async (setter: (data: WeatherBoardItem[]) => void) => {
  const { data: weatherLogsData, error: weatherLogsError } = await supabase
    .from('weather_logs')
    .select('id, user_id, weather, note, updated_at, profiles(nickname, avatar_emoji), weather_log_activities(activity_tag_id, activity_tags(tag_name))')
    .eq('logged_date', new Date().toISOString().split('T')[0]);
  if (weatherLogsError) return Alert.alert(weatherLogsError.message);
  const formattedData = weatherLogsData.map((log) => ({
    ...log,
    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
    tags: log.weather_log_activities
      .filter((tag) => tag.activity_tags !== null)
      .map((tag) => {
        return {
          id: tag.activity_tag_id,
          name: (tag.activity_tags as unknown as { tag_name: string }).tag_name,
        };
      }),
    weather_log_activities: undefined,
  }));
  setter(formattedData);
};

// 未読通知数をweather_log_idごとに集計
const fetchNotificationsData = async (setter: (data: Record<string, number>) => void) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
  const { data: notificationsData, error: notificationsError } = await supabase.from('notifications').select('weather_log_id').eq('type', 'comment').eq('to_user_id', user.id).eq('is_read', false);
  if (notificationsError) return Alert.alert(notificationsError.message);
  const unreadCountMap = notificationsData.reduce(
    (acc, notigication) => {
      acc[notigication.weather_log_id] = (acc[notigication.weather_log_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  setter(unreadCountMap);
};

const fetchCommentsData = async (setter: (data: CommentsStatus) => void) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
  const { data: commentsData, error: commentsError } = await supabase.from('comments').select('weather_log_id, user_id, profiles(avatar_emoji)');
  if (commentsError) return Alert.alert(commentsError.message);

  const commentersMap = commentsData.reduce((acc, status) => {
    const profiles = status.profiles as any;
    const avatars = Array.isArray(profiles) ? profiles[0].avatar_emoji : profiles?.avatar_emoji;
    const isIncludes = acc[status.weather_log_id]?.commenters.some((commenter) => commenter.user_id === status.user_id);
    acc[status.weather_log_id] = { commenters: [...(acc[status.weather_log_id]?.commenters ?? []), ...(isIncludes ? [] : [{ user_id: status.user_id, emoji: avatars }])], count: (acc[status.weather_log_id]?.count ?? 0) + 1 };
    return acc;
  }, {} as CommentsStatus);

  setter(commentersMap);
};

export default function HomeScreen() {
  const [boardData, setBoardData] = useState<WeatherBoardItem[]>([]);
  const [userData, setUserData] = useState<WeatherBoardItem | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [commentStatus, setCommentStatus] = useState<CommentsStatus>({});

  // ボードデータ取得 + weather_logsのリアルタイム監視
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
      const channelName = `board-${user.id}`;
      const existing = supabase.getChannels().find((channel) => channel.subTopic === channelName);
      if (existing) await supabase.removeChannel(existing);
      fetchBoardData(setBoardData);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_logs' }, () => {
          fetchBoardData(setBoardData);
        })
        .subscribe();
    };

    setUp();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 未読通知数取得 + notificationsのリアルタイム監視
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
      const channelName = `unreadCounts-${user.id}`;
      const existing = supabase.getChannels().find((channel) => channel.subTopic === channelName);
      if (existing) supabase.removeChannel(existing);

      fetchNotificationsData(setUnreadCounts);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotificationsData(setUnreadCounts);
        })
        .subscribe();
    };
    setUp();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
      const channelName = `comment-status-${user.id}`;
      const existing = supabase.getChannels().find((channel) => channel.subTopic === channelName);
      if (existing) supabase.removeChannel(existing);

      fetchCommentsData(setCommentStatus);
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
          fetchCommentsData(setCommentStatus);
        })
        .subscribe();
    };
    setUp();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // boardDataからログインユーザーのデータを抽出（背景画像の天気を決めるため）
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const userData = boardData.filter((data) => data.user_id === user.id);
      if (userData.length > 0) setUserData(userData[0]);
    };
    fetchUserData();
  }, [boardData]);

  const backgroundImage = userData ? WEATHER_IMAGES[userData.weather] : WEATHER_IMAGES.sunny;

  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      {boardData.length === 0 && <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>}
      {boardData.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            まだ投稿はありません。
          </Text>
        </View>
      ) : (
        <WeatherBoard weatherLogs={boardData} unreadCounts={unreadCounts} commentStatus={commentStatus} />
      )}
    </ImageBackground>
  );
}
