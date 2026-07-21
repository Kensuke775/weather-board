import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Calendar } from 'react-native-calendars';

import { WeatherBoardColors } from '@/constants/theme';
import { HistoryLog, WEATHER_CONFIG } from '@/lib/types';

export type WeatherCalendarProps = {
  historyData: HistoryLog[];
  currentUserId: string | null;
  setDisplayMonth: (dateString: string) => void;
};

export default function WeatherCalendar({ historyData, currentUserId, setDisplayMonth }: WeatherCalendarProps) {
  const weatherByDate = useMemo(() => {
    const map = new Map<string, HistoryLog>();
    for (const log of historyData) {
      if (log.user_id === currentUserId) map.set(log.logged_date, log);
    }
    return map;
  }, [historyData, currentUserId]);

  return (
    <Calendar
      onMonthChange={(date) => {
        const month = String(date.month).padStart(2, '0');
        setDisplayMonth(`${date.year}-${month}-01`);
      }}
      hideExtraDays={true}
      theme={{
        backgroundColor: 'transparent',
        calendarBackground: 'transparent',
        dayTextColor: WeatherBoardColors.textPrimaryDark,
        textDisabledColor: WeatherBoardColors.textMutedDark,
        monthTextColor: WeatherBoardColors.textPrimaryDark,
        arrowColor: WeatherBoardColors.buttonBackground,
      }}
      dayComponent={({ date }) => {
        const log = weatherByDate.get(date?.dateString ?? '');
        return (
          <View className="items-center justify-center w-[40px] h-[40px]">
            <Text className="text-[8px]" style={{ color: WeatherBoardColors.textMutedDark }}>
              {date?.day}
            </Text>
            <Text className="text-base">{log ? WEATHER_CONFIG[log.weather].emoji : ''}</Text>
          </View>
        );
      }}
    />
  );
}
