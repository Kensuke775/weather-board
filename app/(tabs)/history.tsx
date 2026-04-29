import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import WeatherCalendar from '@/components/WeatherCalendar';
import { supabase } from '@/lib/supabase';
import { HistoryLog, WEATHER_CONFIG, WeatherType } from '@/lib/types';

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
      const { data: historyData, error: historyError } = await supabase.from('weather_logs').select('id, user_id, weather, logged_date, profiles(avatar_emoji)').gte('logged_date', currentMonth).lte('logged_date', initialMonthEnd);
      if (historyError) return Alert.alert(historyError.message);
      // Supabaseの型推論が配列と判定するためキャスト（実際はオブジェクトで返る）
      setHistoryData(historyData as unknown as HistoryLog[]);
      setCurrentUserId(user.id);
    };
    fetchHistory();
  }, [currentMonth, initialMonthEnd]);
  return (
    <View className="w-full h-full flex justify-center">
      <View>
        <View>
          <Text>履歴</Text>
          <WeatherCalendar historyData={historyData} currentUserId={currentUserId} setDisplayMonth={setCurrentMonth} />
          <View className="flex flex-row">
            {Object.entries(weatherHistgram).map(([key, value]) => (
              <View key={key}>
                <Text>{WEATHER_CONFIG[key as WeatherType].emoji}</Text>
                <Text>{value === 0 ? null : value}</Text>
              </View>
            ))}
          </View>
          <View>
            <Text>{currentUserData.length > 0 ? `${month}月は${WEATHER_CONFIG[mostWeather as WeatherType].emoji}が多いですね` : null}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
