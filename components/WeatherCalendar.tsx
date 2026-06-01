import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';

import CommentSection from '@/components/CommentSection';
import { WeatherBoardColors } from '@/constants/theme';
import { useRoom } from '@/context/RoomContext';
import { supabase } from '@/lib/supabase';
import { HistoryLog, WEATHER_CONFIG, WeatherType } from '@/lib/types';

export type WeatherCalendarProps = {
  historyData: HistoryLog[];
  currentUserId: string | null;
  setDisplayMonth: (dateString: string) => void;
};

type HistoryDayItem = {
  id: string;
  user_id: string;
  weather: WeatherType;
  note: string | null;
  updated_at: string;
  room_id: string;
  profiles: { avatar_emoji: string; nickname: string } | null;
  weather_log_activities: {
    activity_tag_id: string;
    activity_tags: { tag_name: string } | null;
  }[];
  comments: {
    id: string;
    user_id: string;
    profiles: { avatar_emoji: string } | null;
  }[];
};

type RawHistoryData = Omit<HistoryDayItem, 'profiles' | 'weather_log_activities' | 'comments'> & {
  profiles: { avatar_emoji: string; nickname: string } | { avatar_emoji: string; nickname: string }[] | null;
  weather_log_activities: {
    activity_tag_id: string;
    activity_tags: { tag_name: string } | { tag_name: string }[] | null;
  }[];
  comments: {
    id: string;
    user_id: string;
    profiles: { avatar_emoji: string } | { avatar_emoji: string }[] | null;
  }[];
};

export default function WeatherCalendar({ historyData, currentUserId, setDisplayMonth }: WeatherCalendarProps) {
  const { currentRoomId, setCurrentRoomId, rooms } = useRoom();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [historyItem, setHistoryItem] = useState<HistoryDayItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryDayItem | null>(null);
  const [isCommentVisible, setIsCommentVisible] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDayPressing, setIsDayPressing] = useState(false);

  const handleDayPress = async (date: string | undefined) => {
    if (isDayPressing) return;
    setIsDayPressing(true);
    try {
      const { data: historyDayData, error: historyDayError } = await supabase
        .from('weather_logs')
        .select('id, user_id, weather, note, updated_at, room_id, profiles(avatar_emoji, nickname), weather_log_activities(activity_tag_id, activity_tags(tag_name)), comments(id, user_id, profiles(avatar_emoji))')
        .eq('logged_date', date)
        .eq('room_id', currentRoomId);
      if (historyDayError) {
        console.error('[WeatherCalendar] handleDayPress', historyDayError.message);
        Alert.alert('ログの取得に失敗しました。');
        return;
      }

      const formatedData = (historyDayData as RawHistoryData[]).map((item) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        weather_log_activities: item.weather_log_activities.map((activity) => ({
          ...activity,
          activity_tags: Array.isArray(activity.activity_tags) ? activity.activity_tags[0] : activity.activity_tags,
        })),
        comments: item.comments.map((comment) => ({
          ...comment,
          profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
        })),
      }));

      setHistoryItem(formatedData);
      setSelectedDate(date ?? null);
      setIsLoading(false);
    } finally {
      setIsDayPressing(false);
    }
  };

  useEffect(() => {
    if (isModalVisible && selectedDate) {
      handleDayPress(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId]);

  const currentUserData = historyData.filter((data) => data.user_id === currentUserId);
  const weatherHistgram: Record<string, number> = {};
  for (const weatherKey of Object.keys(WEATHER_CONFIG)) {
    const count = currentUserData.filter((data) => data.weather === weatherKey).length;
    weatherHistgram[weatherKey] = count;
  }
  const mostWeather = Object.entries(weatherHistgram).reduce((max, current) => (max[1] < current[1] ? current : max))[0];
  const currentRoomName = rooms?.find((item) => item?.rooms.id === currentRoomId)?.rooms.name;

  return (
    <>
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
              <Pressable
                onPress={() => {
                  if (dayLogs.length === 0) return;
                  setIsModalVisible(true);
                  handleDayPress(date?.dateString);
                }}
                className="relative w-[40px] h-[48px]">
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
              </Pressable>
            );
          }}
        />

        <View className="px-4 pb-4">
          <Text className="text-sm font-bold text-center mb-4" style={{ color: WeatherBoardColors.textMuted }}>
            Histgram
          </Text>
          <View className="flex-row justify-between items-center mb-4">
            {Object.entries(weatherHistgram).map(([key, value]) => (
              <View key={key} className="flex flex-row items-center gap-1">
                <Text className="text-xl font-bold">{WEATHER_CONFIG[key as WeatherType].emoji}</Text>
                <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  {value === 0 ? null : value}
                </Text>
              </View>
            ))}
          </View>

          <Text className="text-sm font-bold text-center" style={{ color: WeatherBoardColors.textMuted }}>
            {currentUserData.length > 0 ? `${WEATHER_CONFIG[mostWeather as WeatherType].emoji} Most Weather ${WEATHER_CONFIG[mostWeather as WeatherType].emoji}` : 'No Record'}
          </Text>
        </View>
      </BlurView>

      <Modal visible={isModalVisible} transparent={true} animationType={'slide'}>
        <BlurView intensity={20} tint="dark" className="flex-1">
          <Pressable onPress={() => setIsModalVisible(false)} className="flex-1">
            <View className="pt-40 pb-20 px-4">
              <View className="pb-4 flex-row items-center justify-between">
                <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textMuted }}>{`履歴: ${selectedDate}`}</Text>
                <Pressable onPress={() => setIsPickerVisible(true)} className="flex-row items-center gap-2 mb-2 py-2 px-2 bg-black/30 self-start rounded-xl border" style={{ borderColor: WeatherBoardColors.glassBorder }}>
                  <Text className="text-sm text-white font-bold">{`部屋: ${currentRoomName}`}</Text>
                  <Ionicons name="chevron-down" size={16} color="white" />
                </Pressable>
              </View>
              <FlatList
                data={historyItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  !isLoading ? (
                    <View>
                      <Text className="text-base text-white font-bold">投稿はありません。</Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => {
                  const backgroundColor = WEATHER_CONFIG[item.weather].color;
                  const seenUserIds = new Set();
                  const uniqueCommenters = item?.comments.filter((comment) => {
                    if (seenUserIds.has(comment.user_id)) return false;
                    seenUserIds.add(comment.user_id);
                    return true;
                  });
                  return (
                    <>
                      <Pressable
                        onPress={() => {
                          setSelectedItem(item);
                          setIsCommentVisible(true);
                        }}
                        className="mb-3"
                        style={{ flex: 1 }}>
                        <BlurView intensity={40} tint="light" className="p-4 border" style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: backgroundColor }}>
                          <View className="flex flex-row items-center gap-1 mb-2">
                            <Text className="text-xl">{item.profiles?.avatar_emoji}</Text>
                            <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                              {item.profiles?.nickname}
                            </Text>
                            <Text className="text-lg">{WEATHER_CONFIG[item?.weather].emoji}</Text>
                          </View>
                          <View className="flex flex-row items-center gap-1 mb-2">
                            <Text className="text-xs flex-1 overflow-hidden" style={{ color: WeatherBoardColors.textPrimary, height: 30 }} numberOfLines={2}>
                              {item?.note}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <View className="flex-row items-center gap-2 flex-wrap overflow-hidden" style={{ height: 13 }}>
                              {item?.weather_log_activities.map((activity) => {
                                return (
                                  <Text key={activity?.activity_tag_id} numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimary }}>
                                    #{activity.activity_tags?.tag_name}
                                  </Text>
                                );
                              })}
                            </View>
                            <View className="flex-row items-center gap-2">
                              <View className="flex-row items-center gap-1">
                                {uniqueCommenters.map((comment) => {
                                  return (
                                    <Text key={comment.id} className="text-[10px]">
                                      {comment.profiles?.avatar_emoji}
                                    </Text>
                                  );
                                })}
                              </View>
                              <View className="flex-row gap-1 items-center">
                                <Ionicons name="chatbubble-ellipses-outline" size={12} />
                                <Text className="text-xs font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                                  {item?.comments.length ?? 0}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </BlurView>

                        <View className="flex-row justify-end">
                          <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
                            {new Date(item.updated_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </Pressable>
                    </>
                  );
                }}></FlatList>

              {selectedItem && (
                <Modal visible={isCommentVisible} animationType="slide" transparent={true}>
                  <View className="flex-1 justify-end">
                    <BlurView intensity={40} tint="dark" className="flex-1 p-5" style={{ backgroundColor: WEATHER_CONFIG[selectedItem.weather].color }}>
                      <View className="flex-row justify-between mb-5 mt-20">
                        <Pressable onPress={() => setIsCommentVisible(false)}>
                          <BlurView intensity={40} tint="dark" style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
                            <Ionicons name="close" size={20} style={{ color: WeatherBoardColors.textPrimary }} />
                          </BlurView>
                        </Pressable>
                      </View>
                      <View className="mb-4">
                        <View className="flex flex-row items-center gap-3 mb-4">
                          <Text className="text-xl">{selectedItem.profiles?.avatar_emoji}</Text>
                          <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                            {selectedItem.profiles?.nickname}
                          </Text>
                          <Text className="text-lg">{WEATHER_CONFIG[selectedItem.weather].emoji}</Text>
                        </View>
                        <View className="flex flex-row items-center gap-1 mb-4">
                          <Text className="text-xs" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={2}>
                            {selectedItem.note}
                          </Text>
                        </View>

                        <View>
                          <View className="flex-row items-center gap-2 flex-wrap mb-1">
                            {selectedItem.weather_log_activities.map((activity) => {
                              return (
                                <Text key={activity.activity_tag_id} numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimary }}>
                                  #{activity.activity_tags?.tag_name}
                                </Text>
                              );
                            })}
                          </View>
                          <View className="flex-row justify-end">
                            <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
                              posted:{new Date(selectedItem.updated_at).toLocaleTimeString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <CommentSection to_user_id={selectedItem.user_id} weather_log_id={selectedItem.id} readOnly={true} />
                    </BlurView>
                  </View>
                </Modal>
              )}

              <Modal visible={isPickerVisible} transparent={true} animationType="slide">
                <Pressable style={{ flex: 1 }} onPress={() => setIsPickerVisible(false)}>
                  <View onStartShouldSetResponder={() => true} className="pb-32" style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white' }}>
                    <Text className="text-center font-bold pt-8">部屋を選んでください</Text>
                    <Picker
                      selectedValue={currentRoomId}
                      onValueChange={(value) => {
                        setCurrentRoomId(value);
                      }}>
                      {rooms.map((room) => (
                        <Picker.Item key={room.rooms.id} label={room.rooms.name} value={room.rooms.id} />
                      ))}
                    </Picker>
                  </View>
                </Pressable>
              </Modal>
            </View>
          </Pressable>
        </BlurView>
      </Modal>
    </>
  );
}
