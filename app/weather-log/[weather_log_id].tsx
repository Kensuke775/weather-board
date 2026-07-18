import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvatarWeatherBadge from '@/components/AvatarWeatherBadge';
import CommentSection from '@/components/CommentSection';
import PostReactionBar from '@/components/PostReactionBar';
import ReportBlockMenu from '@/components/ReportBlockMenu';
import TalkButton from '@/components/TalkButton';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { WeatherType } from '@/lib/types';

type WeatherLogDetail = {
  id: string;
  user_id: string;
  weather: WeatherType;
  note: string | null;
  updated_at: string;
  logged_date: string;
  nickname: string;
  avatar_emoji: string;
  tags: { id: string; name: string }[];
};

const fetchWeatherLogDetail = async (weatherLogId: string, setter: (data: WeatherLogDetail) => void, loadingSetter: (loading: boolean) => void) => {
  const { data, error } = await supabase
    .from('weather_logs')
    .select('id, user_id, weather, note, updated_at, logged_date, profiles(nickname, avatar_emoji), weather_log_activities(activity_tag_id, activity_tags(tag_name))')
    .eq('id', weatherLogId)
    .single();
  if (error) {
    console.error('[weather-log/[id]] fetchWeatherLogDetail', error.message);
    Alert.alert('投稿の取得に失敗しました。');
    return;
  }
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const tags = data.weather_log_activities
    .filter((tag) => tag.activity_tags !== null)
    .map((tag) => {
      const activityTag = Array.isArray(tag.activity_tags) ? tag.activity_tags[0] : tag.activity_tags;
      return { id: tag.activity_tag_id, name: activityTag.tag_name };
    });
  setter({
    id: data.id,
    user_id: data.user_id,
    weather: data.weather,
    note: data.note,
    updated_at: data.updated_at,
    logged_date: data.logged_date,
    nickname: profile.nickname,
    avatar_emoji: profile.avatar_emoji,
    tags,
  });
  loadingSetter(false);
};

const countConsecutiveDays = (loggedDates: string[], startDate: string): number => {
  const dateSet = new Set(loggedDates);
  let streak = 0;
  const cursor = new Date(`${startDate}T00:00:00Z`);
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
};

const fetchStreakCount = async (userId: string, loggedDate: string, setter: (count: number) => void) => {
  const { data, error } = await supabase.from('weather_logs').select('logged_date').eq('user_id', userId).lte('logged_date', loggedDate);
  if (error) {
    console.error('[weather-log/[id]] fetchStreakCount', error.message);
    return;
  }
  setter(countConsecutiveDays(data.map((row) => row.logged_date), loggedDate));
};

const markAsRead = async (userId: string, weatherLogId: string) => {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('to_user_id', userId).eq('weather_log_id', weatherLogId);
  if (error) {
    console.error('[weather-log/[id]] markAsRead', error.message);
  }
};

const handleDeletePost = async (weatherLogId: string, onDeleted: () => void) => {
  const { error } = await supabase.from('weather_logs').delete().eq('id', weatherLogId);
  if (error) {
    console.error('[weather-log/[id]] handleDeletePost', error.message);
    Alert.alert('投稿の削除に失敗しました。');
    return;
  }
  onDeleted();
};

export default function WeatherLogDetailScreen() {
  const { weather_log_id } = useLocalSearchParams<{ weather_log_id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const userId = user?.id;
  const [detail, setDetail] = useState<WeatherLogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streakCount, setStreakCount] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    await fetchWeatherLogDetail(weather_log_id, setDetail, setIsLoading);
  }, [weather_log_id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!detail) return;
    fetchStreakCount(detail.user_id, detail.logged_date, setStreakCount);
  }, [detail]);

  useEffect(() => {
    if (!userId || !weather_log_id) return;
    markAsRead(userId, weather_log_id);
  }, [userId, weather_log_id]);

  if (isLoading || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
        <View style={{ height: insets.top + 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={WeatherBoardColors.buttonBackground} />
        </View>
      </View>
    );
  }

  const formattedDate = new Date(detail.updated_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const isOwnPost = userId === detail.user_id;

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      {/* Nav bar */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 20,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={20} color={WeatherBoardColors.textPrimaryDark} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!isOwnPost && <TalkButton to_user_id={detail.user_id} weather_log_id={detail.id} variant="light" />}
          {isOwnPost && (
            <Pressable
              onPress={() =>
                Alert.alert('確認', 'この投稿を削除しますか？\n削除すると元に戻せません。', [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '削除する', style: 'destructive', onPress: () => handleDeletePost(detail.id, () => router.back()) },
                ])
              }
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={18} color={WeatherBoardColors.textMutedDark} />
            </Pressable>
          )}
          {!isOwnPost && <ReportBlockMenu targetUserId={detail.user_id} weatherLogId={detail.id} onBlocked={() => router.back()} variant="header" />}
        </View>
      </View>

      {/* Header info card: avatar + name + streak + note + tags */}
      <View style={{ ...CardStyle, marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pressable
            onPress={() => router.push(`/user-profile?userId=${detail.user_id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <AvatarWeatherBadge avatarEmoji={detail.avatar_emoji} weather={detail.weather} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{detail.nickname}</Text>
              <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedDark, marginTop: 1 }}>{formattedDate}</Text>
            </View>
          </Pressable>
          {streakCount !== null && streakCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5, gap: 4 }}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>{streakCount}日</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 14, color: WeatherBoardColors.textPrimaryDark, lineHeight: 20, marginBottom: detail.tags.length > 0 ? 10 : 0 }}>{detail.note}</Text>

        {detail.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {detail.tags.map((tag) => (
              <View key={tag.id} style={{ backgroundColor: WeatherBoardColors.tagBackground, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, color: WeatherBoardColors.textPrimaryDark }}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Reaction bar */}
      <View style={{ paddingHorizontal: 16 }}>
        <PostReactionBar weatherLogId={detail.id} />
      </View>

      {/* Comments */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <CommentSection to_user_id={detail.user_id} weather_log_id={detail.id} />
      </View>
    </View>
  );
}
