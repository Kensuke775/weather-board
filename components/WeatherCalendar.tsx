import { Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { WeatherBoardColors } from '@/constants/theme';
import { HistoryLog, WEATHER_CONFIG } from '@/lib/types';
import { BlurView } from 'expo-blur';

export type WeatherCalendarProps = {
  historyData: HistoryLog[];
  currentUserId: string | null;
  setDisplayMonth: (dateString: string) => void;
};

export default function WeatherCalendar({ historyData, currentUserId, setDisplayMonth }: WeatherCalendarProps) {
  return (
    <BlurView intensity={20} tint="dark" className="overflow-hidden border" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder }}>
      <Calendar
        onMonthChange={(date) => {
          const month = String(date.month).padStart(2, '0');
          setDisplayMonth(`${date.year}-${month}-01`);
        }}
        hideExtraDays={true}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          dayTextColor: '#ffffff',
          textDisabledColor: 'rgba(255,255,255, 0.3)',
          monthTextColor: '#ffffff',
          arrowColor: '#ffffff',
        }}
        dayComponent={({ date }) => {
          const dayLogs = historyData.filter((daylog) => daylog.logged_date === date?.dateString);
          const myLog = dayLogs.find((log) => log.user_id === currentUserId);
          const otherLogs = dayLogs.filter((log) => log.user_id !== currentUserId);
          return (
            <View className="relative w-[40px] h-[48px]">
              <Text className="absolute left-0 right-0 text-[8px]" style={{ color: '#ffffff' }}>
                {date?.day}
              </Text>
              <View className="absolute inset-0 items-center justify-center">
                <View className="relative">
                  <Text>{myLog?.profiles.avatar_emoji}</Text>
                  {myLog ? <Text className="text-[9px] absolute -top-1 -right-1">{WEATHER_CONFIG[myLog.weather].emoji}</Text> : null}
                </View>
              </View>
              <View className="absolute bottom-0 left-0 flex-row">
                {otherLogs.slice(0, 3).map((other) => (
                  <View key={other.user_id} className="relative left-0 bottom-0">
                    <View className="relative">
                      <Text className="text-[8px]">{other?.profiles.avatar_emoji}</Text>
                      {other ? <Text className="text-[7px] absolute -top-1 -right-1">{WEATHER_CONFIG[other.weather].emoji}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />
    </BlurView>
  );
}
