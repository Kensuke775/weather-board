import { useCallback, useState } from 'react';
import { Alert, ImageBackground, Text, View } from 'react-native';

import { useFocusEffect } from 'expo-router';

import WeatherCalendar from '@/components/WeatherCalendar';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { HistoryLog, WeatherType } from '@/lib/types';

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');

function initialMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export default function History() {
  const { currentRoomId } = useRoom();
  const { user } = useUser();
  const userId = user?.id;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryLog[]>([]);
  const [currentMonth, setCurrentMonth] = useState(initialMonthStart());
  const [year, month] = currentMonth.split('-').map(Number);
  const initializeMonth = String(month).padStart(2, '0');
  const dayLast = String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const initialMonthEnd = `${year}-${initializeMonth}-${dayLast}`;

  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        if (!userId || !currentRoomId) return;
        const { data: historyData, error: historyError } = await supabase
          .from('weather_logs')
          .select('id, user_id, weather, logged_date, profiles(avatar_emoji)')
          .gte('logged_date', currentMonth)
          .lte('logged_date', initialMonthEnd)
          .eq('room_id', currentRoomId)
          .order('updated_at', { ascending: false });
        if (historyError) {
          console.error('[history] fetchHistory', historyError.message);
          Alert.alert('ヒストリーの取得に失敗しました。');
          return;
        }

        const rows = historyData ?? [];
        const seen = new Map<string, (typeof rows)[number]>();
        for (const record of rows) {
          const key = `${record.logged_date}|${record.user_id}`;
          if (!seen.has(key)) seen.set(key, record);
        }

        const result: HistoryLog[] = Array.from(seen.values()).map((data) => ({
          ...data,
          weather: data.weather as WeatherType,
          profiles: {
            avatar_emoji: data.profiles[0]?.avatar_emoji ?? '',
          },
        }));

        setHistoryData(result);
        setCurrentUserId(userId);
      };
      fetchHistory();
    }, [currentMonth, initialMonthEnd, currentRoomId, userId]),
  );
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-5">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
      <View className="pt-24 pb-40">
        <Text className="text-4xl text-center mb-8" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
          History
        </Text>
        <WeatherCalendar historyData={historyData} currentUserId={currentUserId} setDisplayMonth={setCurrentMonth} />
      </View>
    </ImageBackground>
  );
}
