import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, Text, View } from 'react-native';

import { BlurView } from 'expo-blur';
import { Calendar } from 'react-native-calendars';

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import CommentSection from '@/components/CommentSection';
import ReportBlockMenu from '@/components/ReportBlockMenu';
import { WeatherBoardColors } from '@/constants/theme';
import { AVATAR_BUTTON, BLUR_INTENSITY, CARD_TEXT } from '@/constants/ui';
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

const formatNote = (note: string | null | undefined) => {
  if (!note || note === 'null') return null;
  return note;
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

  const handleDeletePost = async (weatherLogId: string) => {
    const { error } = await supabase.from('weather_logs').delete().eq('id', weatherLogId);
    if (error) {
      console.error('[WeatherCalendar] handleDeletePost', error.message);
      Alert.alert('投稿の削除に失敗しました。');
      return;
    }
    setHistoryItem((prev) => prev.filter((item) => item.id !== weatherLogId));
    setIsCommentVisible(false);
  };

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

  const weatherHistgram = useMemo(() => {
    const histgram: Record<string, number> = Object.fromEntries(Object.keys(WEATHER_CONFIG).map((key) => [key, 0]));
    for (const data of historyData) {
      if (data.user_id !== currentUserId) continue;
      histgram[data.weather] += 1;
    }
    return histgram;
  }, [historyData, currentUserId]);
  const weatherEntries = Object.entries(weatherHistgram);
  const mostWeather = weatherEntries.length > 0 ? weatherEntries.reduce((max, current) => (max[1] < current[1] ? current : max))[0] : null;
  const currentRoomName = rooms?.find((item) => item?.rooms.id === currentRoomId)?.rooms.name;
  const hasCurrentUserRecord = Object.values(weatherHistgram).some((count) => count > 0);

  const dayLogByDate = useMemo(() => {
    const dateRecord = new Map<string, { myLog: HistoryLog | undefined; otherLogs: HistoryLog[] }>();
    for (const log of historyData) {
      const key = log.logged_date;
      if (!dateRecord.has(key)) dateRecord.set(key, { myLog: undefined, otherLogs: [] });
      const entry = dateRecord.get(key)!;
      if (log.user_id === currentUserId) {
        entry.myLog = log;
      } else {
        entry.otherLogs.push(log);
      }
    }
    return dateRecord;
  }, [historyData, currentUserId]);

  return (
    <>
      <View className="border p-2" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ position: 'relative' }}>
          <Pressable onPress={() => setIsPickerVisible(true)} className="flex-row items-center gap-1 py-1 px-2 bg-black/30 rounded-xl border" style={{ position: 'absolute', top: 0, left: 0, borderColor: WeatherBoardColors.glassBorder, zIndex: 1 }}>
            <Text className="text-[10px] text-white font-bold">{currentRoomName && currentRoomName.length > 3 ? `${currentRoomName.slice(0, 3)}...` : currentRoomName}</Text>
            <Ionicons name="chevron-down" size={10} color="white" />
          </Pressable>
          <Text className="text-sm font-bold text-center" style={{ color: WeatherBoardColors.textMuted }}>
            {hasCurrentUserRecord ? `${WEATHER_CONFIG[mostWeather as WeatherType].emoji} Most Weather ${WEATHER_CONFIG[mostWeather as WeatherType].emoji}` : 'No Record'}
          </Text>
        </View>
        <Calendar
          onMonthChange={(date) => {
            const month = String(date.month).padStart(2, '0');
            setDisplayMonth(`${date.year}-${month}-01`);
          }}
          hideExtraDays={true}
          style={{ marginBottom: -14 }}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            dayTextColor: '#ffffff',
            textDisabledColor: 'rgba(255,255,255, 0.3)',
            monthTextColor: '#ffffff',
            arrowColor: '#ffffff',
          }}
          dayComponent={({ date }) => {
            const { myLog, otherLogs } = dayLogByDate.get(date?.dateString ?? '') ?? { myLog: undefined, otherLogs: [] };
            return (
              <Pressable
                onPress={() => {
                  if (!myLog && otherLogs.length === 0) return;
                  setIsModalVisible(true);
                  handleDayPress(date?.dateString);
                }}
                className="relative w-[40px] h-[40px]">
                <Text className="absolute left-0 right-0 text-[8px]" style={{ color: '#ffffff' }}>
                  {date?.day}
                </Text>
                <View className="absolute inset-0 items-center justify-center">
                  <View className="relative">
                    <Text className="text-[10px]">{myLog?.profiles.avatar_emoji}</Text>
                    {myLog ? <Text className="text-[6px] absolute -top-1 -right-1">{WEATHER_CONFIG[myLog.weather].emoji}</Text> : null}
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

        <View className="px-4 pb-2">
          <Text className="text-sm font-bold text-center mb-2" style={{ color: WeatherBoardColors.textMuted }}>
            Histgram
          </Text>
          <View className="flex-row justify-between items-center">
            {Object.entries(weatherHistgram).map(([key, value]) => (
              <View key={key} className="flex flex-row items-center gap-1">
                <Text className="text-base font-bold">{WEATHER_CONFIG[key as WeatherType].emoji}</Text>
                <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  {value === 0 ? null : value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType={'slide'}>
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Pressable onPress={() => setIsModalVisible(false)} className="flex-1">
            <View className="pt-40 pb-20 px-4">
              <View className="pb-4 flex-row items-center justify-between">
                <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textMuted }}>{`履歴: ${selectedDate ?? ''}`}</Text>
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
                  const backgroundColor = Platform.OS === 'ios' ? WEATHER_CONFIG[item.weather].color : WEATHER_CONFIG[item.weather].darkColor;
                  const seenCommenter = new Map<string, string | undefined>();
                  for (const commenter of item.comments) {
                    seenCommenter.set(commenter.user_id, commenter.profiles?.avatar_emoji);
                  }
                  const uniqueCommenters = [...seenCommenter.entries()];
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedItem(item);
                        setIsCommentVisible(true);
                      }}
                      className="mb-3"
                      style={{ flex: 1 }}>
                      <BlurView intensity={BLUR_INTENSITY} tint="light" className="p-4 border" style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: backgroundColor }}>
                        <View className="flex flex-row items-center gap-1 mb-2">
                          <Text className="text-xl">{item.profiles?.avatar_emoji}</Text>
                          <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }} numberOfLines={1}>
                            {item.profiles?.nickname}
                          </Text>
                          <Text className="text-lg">{WEATHER_CONFIG[item?.weather].emoji}</Text>
                        </View>
                        <View className="flex flex-row items-center gap-1 mb-2">
                          <Text className="text-xs flex-1 overflow-hidden" style={{ color: WeatherBoardColors.textPrimary, height: CARD_TEXT.noteHeight }} numberOfLines={2}>
                            {formatNote(item?.note)}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2 flex-wrap overflow-hidden" style={{ height: CARD_TEXT.tagRowHeight }}>
                          {item?.weather_log_activities
                            .filter((activity) => activity.activity_tags !== null)
                            .map((activity) => {
                              return (
                                <Text key={activity?.activity_tag_id} numberOfLines={1} className="text-[10px]" style={{ color: WeatherBoardColors.textPrimary }}>
                                  #{activity.activity_tags?.tag_name}
                                </Text>
                              );
                            })}
                        </View>
                        <View className="flex-row items-center gap-2 justify-end">
                          <View className="flex-row items-center gap-1">
                            {uniqueCommenters.map(([id, emoji]) => {
                              return (
                                <Text key={id} className="text-[10px]">
                                  {emoji}
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
                      </BlurView>

                      <View className="flex-row justify-end">
                        <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
                          {new Date(item.updated_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}></FlatList>

              {selectedItem && (
                <Modal visible={isCommentVisible} animationType="slide" transparent={true}>
                  <View className="flex-1 justify-end">
                    <BlurView intensity={BLUR_INTENSITY} tint="dark" className="flex-1 p-5" style={{ backgroundColor: Platform.OS === 'ios' ? WEATHER_CONFIG[selectedItem.weather].color : WEATHER_CONFIG[selectedItem.weather].darkColor }}>
                      <View className="flex-row justify-between mb-5 mt-20">
                        <Pressable onPress={() => setIsCommentVisible(false)}>
                          <BlurView intensity={BLUR_INTENSITY} tint="dark" style={{ width: AVATAR_BUTTON.size, height: AVATAR_BUTTON.size, borderRadius: AVATAR_BUTTON.borderRadius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
                            <Ionicons name="close" size={20} style={{ color: WeatherBoardColors.textPrimary }} />
                          </BlurView>
                        </Pressable>
                        {selectedItem && currentUserId === selectedItem.user_id && (
                          <Pressable
                            onPress={() => {
                              Alert.alert('確認', 'この投稿を削除しますか？\n削除すると元に戻せません。', [
                                { text: 'キャンセル', style: 'cancel' },
                                { text: '削除する', style: 'destructive', onPress: () => handleDeletePost(selectedItem.id) },
                              ]);
                            }}>
                            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={{ width: AVATAR_BUTTON.size, height: AVATAR_BUTTON.size, borderRadius: AVATAR_BUTTON.borderRadius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WeatherBoardColors.glassBorder }}>
                              <Ionicons name="trash-outline" size={18} style={{ color: WeatherBoardColors.textPrimary }} />
                            </BlurView>
                          </Pressable>
                        )}
                        {selectedItem && currentUserId !== selectedItem.user_id && <ReportBlockMenu targetUserId={selectedItem.user_id} weatherLogId={selectedItem.id} onBlocked={() => setIsCommentVisible(false)} />}
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
                            {formatNote(selectedItem.note)}
                          </Text>
                        </View>

                        <View>
                          <View className="flex-row items-center gap-2 flex-wrap mb-1">
                            {selectedItem.weather_log_activities
                              .filter((activity) => activity.activity_tags !== null)
                              .map((activity) => {
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
            </View>
          </Pressable>
        </View>
      </Modal>

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
    </>
  );
}
