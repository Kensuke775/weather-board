import { useCallback, useMemo, useState } from 'react';
import { Alert, ImageBackground, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useFocusEffect } from 'expo-router';

import WeatherCalendar from '@/components/WeatherCalendar';
import { BrownTheme, Fonts, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { HistoryLog, WEATHER_CONFIG, WeatherType } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');

const WEATHER_SCORE: Record<WeatherType, number> = {
  sunny: 5,
  partly_cloudy: 4,
  cloudy: 3,
  rainy: 2,
  foggy: 2,
  stormy: 1,
  snowy: 2,
};

function initialMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export default function History() {
  const { user } = useUser();
  const userId = user?.id;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryLog[]>([]);
  const [currentMonth, setCurrentMonth] = useState(initialMonthStart());
  const [todayLog, setTodayLog] = useState<{ weather: WeatherType; note: string | null; avatarEmoji: string } | null>(null);
  const [topTags, setTopTags] = useState<{ name: string; count: number }[]>([]);

  const [year, month] = currentMonth.split('-').map(Number);
  const paddedMonth = String(month).padStart(2, '0');
  const dayLast = String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const monthEnd = `${year}-${paddedMonth}-${dayLast}`;

  useFocusEffect(
    useCallback(() => {
      const fetchAll = async () => {
        if (!userId) return;

        const { data: monthData, error: monthError } = await supabase
          .from('weather_logs')
          .select('id, user_id, weather, logged_date, profiles(avatar_emoji)')
          .gte('logged_date', currentMonth)
          .lte('logged_date', monthEnd)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (monthError) {
          console.error('[history] fetchAll', monthError.message);
          Alert.alert('ヒストリーの取得に失敗しました。');
          return;
        }

        const rows = monthData ?? [];
        const seen = new Map<string, (typeof rows)[number]>();
        for (const record of rows) {
          const key = `${record.logged_date}|${record.user_id}`;
          if (!seen.has(key)) seen.set(key, record);
        }
        const result: HistoryLog[] = Array.from(seen.values()).map((data) => ({
          ...data,
          weather: data.weather as WeatherType,
          profiles: { avatar_emoji: (Array.isArray(data.profiles) ? data.profiles[0] : data.profiles)?.avatar_emoji ?? '' },
        }));
        setHistoryData(result);
        setCurrentUserId(userId);

        const today = new Date().toISOString().split('T')[0];
        const { data: todayData } = await supabase
          .from('weather_logs')
          .select('weather, note, profiles(avatar_emoji)')
          .eq('logged_date', today)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (todayData) {
          const prof = Array.isArray(todayData.profiles) ? todayData.profiles[0] : todayData.profiles;
          setTodayLog({ weather: todayData.weather as WeatherType, note: todayData.note, avatarEmoji: prof?.avatar_emoji ?? '' });
        } else {
          setTodayLog(null);
        }

        const userLogIds = result.filter((l) => l.user_id === userId).map((l) => l.id);
        if (userLogIds.length > 0) {
          const { data: activityData } = await supabase
            .from('weather_log_activities')
            .select('activity_tags(tag_name)')
            .in('weather_log_id', userLogIds);
          const counts: Record<string, number> = {};
          for (const row of activityData ?? []) {
            const tags = Array.isArray(row.activity_tags) ? row.activity_tags : [row.activity_tags];
            for (const tag of tags) {
              if (tag?.tag_name) counts[tag.tag_name] = (counts[tag.tag_name] ?? 0) + 1;
            }
          }
          setTopTags(Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, count]) => ({ name, count })));
        } else {
          setTopTags([]);
        }
      };
      fetchAll();
    }, [currentMonth, monthEnd, userId]),
  );

  const streak = useMemo(() => {
    if (!currentUserId) return 0;
    const userDates = new Set(historyData.filter((l) => l.user_id === currentUserId).map((l) => l.logged_date));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 31; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (userDates.has(d.toISOString().split('T')[0])) count++;
      else break;
    }
    return count;
  }, [historyData, currentUserId]);

  const mostWeather = useMemo(() => {
    if (!currentUserId) return null;
    const userLogs = historyData.filter((l) => l.user_id === currentUserId);
    if (userLogs.length === 0) return null;
    const counts: Partial<Record<WeatherType, number>> = {};
    for (const log of userLogs) {
      counts[log.weather] = (counts[log.weather] ?? 0) + 1;
    }
    const entries = Object.entries(counts) as [WeatherType, number][];
    const [topWeather, topCount] = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
    return { topWeather, topCount, breakdown: counts };
  }, [historyData, currentUserId]);

  const emotionTrend = useMemo(() => {
    if (!currentUserId) return [];
    const scoreByDate: Record<string, number> = {};
    for (const log of historyData) {
      if (log.user_id === currentUserId) scoreByDate[log.logged_date] = WEATHER_SCORE[log.weather];
    }
    const result: { day: number; score: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (scoreByDate[dateStr] !== undefined) result.push({ day: d.getDate(), score: scoreByDate[dateStr] });
    }
    return result;
  }, [historyData, currentUserId]);

  const CHART_W = 130;
  const CHART_H = 55;
  const trendPoints = emotionTrend.map((p, i) => ({
    x: emotionTrend.length > 1 ? (i / (emotionTrend.length - 1)) * CHART_W : CHART_W / 2,
    y: CHART_H - ((p.score - 1) / 4) * CHART_H,
    ...p,
  }));

  return (
    <ImageBackground source={backgroundImage} className="flex-1">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="items-center mb-4">
          <Text style={{ fontFamily: Fonts.title, fontSize: 36, color: WeatherBoardColors.textPrimary, textAlign: 'center' }}>History</Text>
          <Text className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>あなたの記録を振り返りましょう</Text>
        </View>

        {/* Streak badge — right-aligned */}
        <View className="flex-row justify-end mb-2">
          <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
            <Text>🔥</Text>
            <Text className="text-sm font-bold" style={{ color: BrownTheme.primaryText }}>連続投稿日数 {streak}日</Text>
          </View>
        </View>

        {/* 2-column: Today's Highlight | Most Weather — separate cards */}
        <View className="flex-row justify-center mb-3" style={{ minHeight: 130 }}>
          <View className="rounded-2xl p-4 mr-1.5" style={{ backgroundColor: 'white', width: '47%' }}>
            <Text className="text-[11px] font-semibold mb-2" style={{ color: BrownTheme.mutedText }}>{"Today's Highlight"}</Text>
            {todayLog ? (
              <>
                <View className="flex-row items-center gap-1 mb-2">
                  <Text className="text-2xl">{WEATHER_CONFIG[todayLog.weather].emoji}</Text>
                  <Text className="text-xs font-bold" style={{ color: BrownTheme.primaryText }}>{WEATHER_CONFIG[todayLog.weather].label}</Text>
                </View>
                <View className="flex-row items-start gap-1">
                  <Text className="text-base">{todayLog.avatarEmoji}</Text>
                  <Text className="text-[11px] flex-1 leading-5" style={{ color: BrownTheme.primaryText }} numberOfLines={4}>{todayLog.note}</Text>
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-2xl mb-1">📭</Text>
                <Text className="text-[10px] text-center" style={{ color: BrownTheme.mutedText }}>今日の記録がありません</Text>
              </View>
            )}
          </View>

          <View className="rounded-2xl p-4 ml-1.5" style={{ backgroundColor: 'white', width: '47%' }}>
            <Text className="text-[11px] font-semibold mb-2" style={{ color: BrownTheme.mutedText }}>Most Weather</Text>
            {mostWeather ? (
              <>
                <Text className="text-3xl font-bold" style={{ color: BrownTheme.primaryText }}>{mostWeather.topCount}日</Text>
                <Text className="text-[11px] mb-2" style={{ color: BrownTheme.mutedText }}>{WEATHER_CONFIG[mostWeather.topWeather].label}が一番多いです</Text>
                <View className="flex-row flex-wrap gap-x-2 gap-y-1">
                  {(Object.entries(mostWeather.breakdown) as [WeatherType, number][])
                    .filter(([, c]) => c > 0)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([w, c]) => (
                      <Text key={w} className="text-[11px]" style={{ color: BrownTheme.mutedText }}>
                        {WEATHER_CONFIG[w].emoji}{c}日
                      </Text>
                    ))}
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-xs text-center" style={{ color: BrownTheme.mutedText }}>記録がありません</Text>
              </View>
            )}
          </View>
        </View>

        {/* Calendar card — unified with emotion trend and tags */}
        <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white' }}>

          {/* Calendar */}
          <View className="p-4">
            <WeatherCalendar historyData={historyData} currentUserId={currentUserId} setDisplayMonth={setCurrentMonth} />
          </View>

          <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder }} />

          {/* 2-column: Emotion trend | Tags TOP3 */}
          <View className="flex-row">
            <View className="flex-1 p-4">
              <Text className="text-[11px] font-semibold mb-2" style={{ color: BrownTheme.mutedText }}>感情の推移</Text>
              {emotionTrend.length > 1 ? (
                <View>
                  <View className="flex-row items-stretch">
                    <View style={{ justifyContent: 'space-between', height: CHART_H, paddingRight: 2 }}>
                      <Text style={{ fontSize: 9 }}>😊</Text>
                      <Text style={{ fontSize: 9 }}>😐</Text>
                      <Text style={{ fontSize: 9 }}>😔</Text>
                    </View>
                    <Svg width={CHART_W} height={CHART_H}>
                      <Polyline
                        points={trendPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={BrownTheme.buttonBackground}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {trendPoints.map((p, i) => (
                        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={BrownTheme.buttonBackground} />
                      ))}
                    </Svg>
                  </View>
                  <View className="flex-row justify-between" style={{ paddingLeft: 16 }}>
                    {emotionTrend.map((p, i) => (
                      <Text key={i} style={{ fontSize: 8, color: BrownTheme.mutedText }}>{p.day}</Text>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="py-3 items-center">
                  <Text className="text-xs text-center" style={{ color: BrownTheme.mutedText }}>データが足りません</Text>
                </View>
              )}
            </View>

            <View style={{ width: 1, backgroundColor: BrownTheme.contentBorder }} />

            <View className="flex-1 p-4">
              <Text className="text-[11px] font-semibold mb-2" style={{ color: BrownTheme.mutedText }}>よく使うタグ TOP3</Text>
              {topTags.length > 0 ? (
                <View className="gap-2">
                  {topTags.map(({ name, count }, i) => (
                    <View key={name} className="flex-row items-center gap-2">
                      <View className="w-4 h-4 rounded-full items-center justify-center" style={{ backgroundColor: ['#C49A6C', '#A67448', '#7A5533'][i] }}>
                        <Text style={{ fontSize: 8, color: 'white', fontWeight: 'bold' }}>{i + 1}</Text>
                      </View>
                      <Text className="text-[11px] flex-1" style={{ color: BrownTheme.primaryText }}>#{name}</Text>
                      <Text className="text-[10px]" style={{ color: BrownTheme.mutedText }}>{count}回</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-xs" style={{ color: BrownTheme.mutedText }}>タグがまだありません</Text>
              )}
            </View>
          </View>

        </View>

      </ScrollView>
    </ImageBackground>
  );
}
