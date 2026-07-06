import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import CommentSection from '@/components/CommentSection';
import ReportBlockMenu from '@/components/ReportBlockMenu';
import ScreenHeader from '@/components/ScreenHeader';
import TalkButton from '@/components/TalkButton';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG, WeatherType } from '@/lib/types';

const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.55)';
const CREAM = '#FCF8F0';

type WeatherLogDetail = {
  id: string;
  user_id: string;
  room_id: string;
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
    .select('id, user_id, room_id, weather, note, updated_at, logged_date, profiles(nickname, avatar_emoji), weather_log_activities(activity_tag_id, activity_tags(tag_name))')
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
    room_id: data.room_id,
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

const fetchStreakCount = async (userId: string, roomId: string, loggedDate: string, setter: (count: number) => void) => {
  const { data, error } = await supabase.from('weather_logs').select('logged_date').eq('user_id', userId).eq('room_id', roomId).lte('logged_date', loggedDate);
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
    fetchStreakCount(detail.user_id, detail.room_id, detail.logged_date, setStreakCount);
  }, [detail]);

  useEffect(() => {
    if (!userId || !weather_log_id) return;
    markAsRead(userId, weather_log_id);
  }, [userId, weather_log_id]);

  if (isLoading || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: CREAM }}>
        <ScreenHeader title="" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY_BROWN} />
        </View>
      </View>
    );
  }

  const formattedDate = new Date(detail.updated_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const cardColor = WEATHER_CONFIG[detail.weather].cardColor;
  const isOwnPost = userId === detail.user_id;

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <ScreenHeader
        title={detail.nickname}
        subtitle={formattedDate}
        avatarEmoji={detail.avatar_emoji}
        titleEmoji={WEATHER_CONFIG[detail.weather].emoji}
        onBack={() => router.back()}
        rightContent={
          <>
            <TalkButton to_user_id={detail.user_id} weather_log_id={detail.id} variant="light" />
            <ReportBlockMenu targetUserId={detail.user_id} weatherLogId={detail.id} onBlocked={() => router.back()} variant="header" />
          </>
        }
      />

      <View style={{ flex: 1, padding: 20 }}>
        {streakCount !== null && streakCount > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 100,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginBottom: 12,
              gap: 6,
            }}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY_BROWN }}>連続投稿日数</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY_BROWN }}>{streakCount}日</Text>
            <Ionicons name="chevron-forward" size={14} color={MUTED_BROWN} />
          </View>
        )}
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ backgroundColor: 'rgba(98,66,33,0.08)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY_BROWN }}>ひとことメモ</Text>
            </View>
            {isOwnPost && (
              <Pressable
                onPress={() => {
                  Alert.alert('確認', 'この投稿を削除しますか？\n削除すると元に戻せません。', [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '削除する', style: 'destructive', onPress: () => handleDeletePost(detail.id, () => router.back()) },
                  ]);
                }}>
                <Ionicons name="trash-outline" size={18} color={MUTED_BROWN} />
              </Pressable>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 20 }}>{WEATHER_CONFIG[detail.weather].emoji}</Text>
            <Text style={{ fontSize: 15, color: PRIMARY_BROWN, flex: 1 }}>{detail.note}</Text>
          </View>

          {detail.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {detail.tags.map((tag) => (
                <Text key={tag.id} style={{ fontSize: 12, color: MUTED_BROWN }}>
                  #{tag.name}
                </Text>
              ))}
            </View>
          )}
        </View>

        <CommentSection to_user_id={detail.user_id} weather_log_id={detail.id} cardColor={cardColor} />
      </View>
    </View>
  );
}
