import WeatherBoard from '@/components/WeatherBoard';
import { supabase } from '@/lib/supabase';
import { WeatherBoardItem } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

const fetchBoardData = async (setter: (data: WeatherBoardItem[]) => void) => {
  const { data: weatherLogsData, error: weatherLogsError } = await supabase.from('weather_logs').select('id, user_id, weather, note, logged_date, profiles(nickname, avatar_emoji)').eq('logged_date', new Date().toISOString().split('T')[0]);
  if (weatherLogsError) return Alert.alert(weatherLogsError.message);
  const formattedData = weatherLogsData.map((log) => ({
    ...log,
    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
  }));
  setter(formattedData);
};

export default function HomeScreen() {
  const [boardData, setBoardData] = useState<WeatherBoardItem[]>([]);
  useEffect(() => {
    fetchBoardData(setBoardData);
    const channel = supabase
      .channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_logs' }, () => {
        fetchBoardData(setBoardData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <View className="flex justify-center w-full h-full">
      <View className="p-20">
        <WeatherBoard weatherLogs={boardData} />
      </View>
    </View>
  );
}
