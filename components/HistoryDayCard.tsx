import { Platform, Pressable, Text, View } from 'react-native';

import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { WeatherBoardColors } from '@/constants/theme';
import { BLUR_INTENSITY, CARD_TEXT } from '@/constants/ui';
import { WEATHER_CONFIG } from '@/lib/types';
import { formatNote, HistoryDayItem } from '@/components/WeatherCalendar';

type HistoryDayCardProps = {
  item: HistoryDayItem;
  onPress: () => void;
};

export default function HistoryDayCard({ item, onPress }: HistoryDayCardProps) {
  const backgroundColor =
    Platform.OS === 'ios' ? WEATHER_CONFIG[item.weather].color : WEATHER_CONFIG[item.weather].darkColor;

  const seenCommenter = new Map<string, string | undefined>();
  for (const commenter of item.comments) {
    seenCommenter.set(commenter.user_id, commenter.profiles?.avatar_emoji);
  }
  const uniqueCommenters = [...seenCommenter.entries()];

  return (
    <Pressable onPress={onPress} className="mb-3" style={{ flex: 1 }}>
      <BlurView
        intensity={BLUR_INTENSITY}
        tint="light"
        className="p-4 border"
        style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor }}>
        <View className="flex flex-row items-center gap-1 mb-2">
          <Text className="text-xl">{item.profiles?.avatar_emoji}</Text>
          <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
            {item.profiles?.nickname}
          </Text>
          <Text className="text-lg">{WEATHER_CONFIG[item.weather].emoji}</Text>
        </View>
        <View className="flex flex-row items-center gap-1 mb-2">
          <Text
            className="text-xs flex-1 overflow-hidden"
            style={{ color: WeatherBoardColors.textPrimary, height: CARD_TEXT.noteHeight }}
            numberOfLines={2}>
            {formatNote(item.note)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 flex-wrap overflow-hidden" style={{ height: CARD_TEXT.tagRowHeight }}>
          {item.weather_log_activities
            .filter((activity) => activity.activity_tags !== null)
            .map((activity) => (
              <Text key={activity.activity_tag_id} numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimary }}>
                #{activity.activity_tags?.tag_name}
              </Text>
            ))}
        </View>
        <View className="flex-row items-center gap-2 justify-end">
          <View className="flex-row items-center gap-1">
            {uniqueCommenters.map(([id, emoji]) => (
              <Text key={id} className="text-[10px]">
                {emoji}
              </Text>
            ))}
          </View>
          <View className="flex-row gap-1 items-center">
            <Ionicons name="chatbubble-ellipses-outline" size={12} />
            <Text className="text-xs font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              {item.comments.length ?? 0}
            </Text>
          </View>
        </View>
      </BlurView>
      <View className="flex-row justify-end">
        <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
          {new Date(item.updated_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Pressable>
  );
}
