import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Text, View } from 'react-native';

import WeatherCalendar from '@/components/WeatherCalendar';
import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { HistoryLog, WEATHER_CONFIG, WeatherType } from '@/lib/types';
import { BlurView } from 'expo-blur';

const backgroundImage = require('@/assets/images/weather/history.png');

function initialMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export default function History() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryLog[]>([]);

  // currentMonthが変わるたびにfetchHistoryが再実行され月次データを取得する
  const [currentMonth, setCurrentMonth] = useState(initialMonthStart());
  const [year, month] = currentMonth.split('-').map(Number);
  const initializeMonth = String(month).padStart(2, '0');
  const dayLast = String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const initialMonthEnd = `${year}-${initializeMonth}-${dayLast}`;

  const currentUserData = historyData.filter((data) => data.user_id === currentUserId);
  const weatherHistgram: Record<string, number> = {};
  for (const weatherKey of Object.keys(WEATHER_CONFIG)) {
    const count = currentUserData.filter((data) => data.weather === weatherKey).length;
    weatherHistgram[weatherKey] = count;
  }

  // reduce の初期値省略で最初の要素をベースに最大値を探す
  const mostWeather = Object.entries(weatherHistgram).reduce((max, current) => (max[1] < current[1] ? current : max))[0];

  useEffect(() => {
    const fetchHistory = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
      const { data: historyData, error: historyError } = await supabase.from('weather_logs').select('id, user_id, weather, logged_date, profiles(avatar_emoji)').gte('logged_date', currentMonth).lte('logged_date', initialMonthEnd).eq('user_id', user.id);
      if (historyError) return Alert.alert(historyError.message);

      
      setHistoryData(historyData as unknown as HistoryLog[]);
      setCurrentUserId(user.id);
    };
    fetchHistory();
  }, [currentMonth, initialMonthEnd]);
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center gap-5 px-5">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <Text className="text-4xl text-center" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
        History
      </Text>
      <View>
        <WeatherCalendar historyData={historyData} currentUserId={currentUserId} setDisplayMonth={setCurrentMonth} />
      </View>
      <BlurView intensity={40} tint="dark" className="overflow-hidden border px-5 py-4" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder }}>
        <View className="flex flex-row justify-between items-center">
          {Object.entries(weatherHistgram).map(([key, value]) => (
            <View key={key} className="flex flex-row items-center gap-1">
              <Text className="text-xl font-bold">{WEATHER_CONFIG[key as WeatherType].emoji}</Text>
              <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                {value === 0 ? null : value}
              </Text>
            </View>
          ))}
        </View>
      </BlurView>
      <View>
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          {currentUserData.length > 0 ? `${month}月は${WEATHER_CONFIG[mostWeather as WeatherType].emoji}が多いですね` : '記録がないです。'}
        </Text>
      </View>
    </ImageBackground>
  );
}
